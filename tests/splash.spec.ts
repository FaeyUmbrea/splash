import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/**
 * Splash E2E. Each test restores the seeded baseline so runs don't poison one another. Renderer is forced
 * to `html` where a sprite must be clicked — DOM sprites are clickable, the WebGL canvas is not.
 */

test.describe.configure({ mode: 'serial' });

/** Force this client to the given renderer (client-scoped, ephemeral to the test context). */
async function useRenderer(page: Page, kind: 'html' | 'webgl'): Promise<void> {
	await page.evaluate(k => (globalThis as any).game.settings.set('splash', 'renderer', k), kind);
}

/** Page uuid of a seeded splash, looked up by name. */
async function uuidOf(page: Page, name: string): Promise<string> {
	return page.evaluate((n) => {
		const g = globalThis as any;
		const j = g.game.journal.getName('E2E Splashes');
		return j.pages.getName(n).uuid as string;
	}, name);
}

/** Reset the lock's synced runtime flag to a clean state and close any open handout (GM only). */
async function resetLock(gmPage: Page, lockUuid: string): Promise<void> {
	await gmPage.evaluate(async (uuid) => {
		const g = globalThis as any;
		for (const app of [...g.foundry.applications.instances.values()]) {
			if (app.id?.startsWith?.('splash-handout-')) await app.close();
		}
		const page = g.fromUuidSync(uuid);
		await page.update({ 'flags.splash.-=runtime': null });
	}, lockUuid);
}

test('module is active with its renderers + actions registered', async ({ pages: { gmPage } }) => {
	const info = await gmPage.evaluate(() => {
		const api = (globalThis as any).game.modules.get('splash')?.api;
		return {
			active: (globalThis as any).game.modules.get('splash')?.active,
			sprites: api ? [...api.sprites.keys()] : [],
			actions: api ? [...api.actions.keys()] : [],
		};
	});
	expect(info.active).toBe(true);
	expect(info.sprites).toEqual(expect.arrayContaining(['text', 'image', 'button', 'panel']));
	expect(info.actions).toEqual(expect.arrayContaining(['close', 'set-value', 'change-state']));
});

test('a fullscreen splash renders and its button is interactive', async ({ pages: { gmPage } }) => {
	await useRenderer(gmPage, 'html');
	const uuid = await uuidOf(gmPage, 'E2E Full');
	await gmPage.evaluate(u => (globalThis as any).game.modules.get('splash').api.launch(u), uuid);

	const overlay = gmPage.locator('#splash-application');
	await expect(overlay).toBeVisible();
	const closeBtn = overlay.getByText('Close', { exact: true });
	await expect(closeBtn).toBeVisible();

	// Clicking the splash's Close button tears the overlay down.
	await closeBtn.click();
	await expect(gmPage.locator('#splash-application')).toHaveCount(0);
});

async function openLockBoth(gmPage: Page, playerPage: Page, uuid: string): Promise<void> {
	await useRenderer(gmPage, 'html');
	await useRenderer(playerPage, 'html');
	await Promise.all([
		gmPage.evaluate(u => (globalThis as any).game.modules.get('splash').api.openHandout(u), uuid),
		playerPage.evaluate(u => (globalThis as any).game.modules.get('splash').api.openHandout(u), uuid),
	]);
	await expect(gmPage.locator('.splash-handout')).toBeVisible();
	await expect(playerPage.locator('.splash-handout')).toBeVisible();
}

test('a synced lock edit on the GM updates a player who never touched it', async ({ pages: { gmPage, playerPage } }) => {
	const uuid = await uuidOf(gmPage, 'E2E Lock');
	try {
		await openLockBoth(gmPage, playerPage, uuid);
		await gmPage.locator('.splash-handout').getByText('Set', { exact: true }).click();
		// The player only updates via the runtime mirror — asserts the visible text, not just the flag.
		await expect(playerPage.locator('.splash-handout').getByText('Code: 1')).toBeVisible();
	} finally {
		await resetLock(gmPage, uuid);
	}
});

test('a synced lock edit on a player is proxied through the GM and mirrored back', async ({ pages: { gmPage, playerPage } }) => {
	const uuid = await uuidOf(gmPage, 'E2E Lock');
	try {
		await openLockBoth(gmPage, playerPage, uuid);
		await playerPage.locator('.splash-handout').getByText('Set', { exact: true }).click();
		await expect(gmPage.locator('.splash-handout').getByText('Code: 1')).toBeVisible();
	} finally {
		await resetLock(gmPage, uuid);
	}
});

test('the GM sees an indicator on a door bound to a splash', async ({ pages: { gmPage } }) => {
	const lockUuid = await uuidOf(gmPage, 'E2E Lock');
	const result = await gmPage.evaluate(async (uuid) => {
		const g = globalThis as any;
		const scene = g.game.scenes.getName('E2E Scene');
		await scene.view();
		await new Promise(r => setTimeout(r, 500));
		const wall = [...scene.walls].find((w: any) => (w.door ?? 0) > 0);
		try {
			await wall.setFlag('splash', 'launchSplash', uuid);
			await new Promise(r => setTimeout(r, 400));
			const badgeWhenBound = !!wall.object?.doorControl?.__splashBadge;
			await wall.unsetFlag('splash', 'launchSplash');
			await new Promise(r => setTimeout(r, 400));
			const badgeWhenUnbound = !!wall.object?.doorControl?.__splashBadge;
			return { badgeWhenBound, badgeWhenUnbound };
		} finally {
			if (wall.getFlag('splash', 'launchSplash')) await wall.unsetFlag('splash', 'launchSplash');
		}
	}, lockUuid);
	expect(result.badgeWhenBound).toBe(true);
	expect(result.badgeWhenUnbound).toBe(false);
});

test('a trigger-bound splash is surfaced for its scene', async ({ pages: { gmPage } }) => {
	const lockUuid = await uuidOf(gmPage, 'E2E Lock');
	const found = await gmPage.evaluate(async (uuid) => {
		const g = globalThis as any;
		const scene = g.game.scenes.getName('E2E Scene');
		const wall = [...scene.walls].find((w: any) => (w.door ?? 0) > 0);
		try {
			await wall.setFlag('splash', 'launchSplash', uuid);
			const api = g.game.modules.get('splash').api;
			const bindings = api.registeredTriggers.flatMap((t: any) => t.listBindings());
			return bindings.some((b: any) => b.sceneId === scene.id && b.splashUuid === uuid);
		} finally {
			await wall.unsetFlag('splash', 'launchSplash');
		}
	}, lockUuid);
	expect(found).toBe(true);
});
