import type { Page } from '@playwright/test';
import { expect, obsTest as test } from './fixtures.ts';

/**
 * OBS Utils integration. Three sessions: GM (director), an OBS client, and an interacting player. The GM
 * selects the watched user through the same Splash setting as the Director tab; the OBS client's compat layer reacts. Every test
 * restores the world (closes splashes, clears the spectate selection, resets renderers).
 *
 * Requires obs-utils and lib-wrapper enabled in the world.
 */

test.describe.configure({ mode: 'serial' });

async function useRenderer(page: Page, kind: 'html' | 'webgl'): Promise<void> {
	await page.evaluate(k => (globalThis as any).game.settings.set('splash', 'renderer', k), kind);
}
async function uuidOf(page: Page, name: string): Promise<string> {
	return page.evaluate(n => (globalThis as any).game.journal.getName('E2E Splashes').pages.getName(n).uuid as string, name);
}
async function userId(page: Page): Promise<string> {
	return page.evaluate(() => (globalThis as any).game.userId as string);
}
async function closeHandouts(page: Page): Promise<void> {
	await page.evaluate(async () => {
		for (const app of [...(globalThis as any).foundry.applications.instances.values()]) {
			if (app.id?.startsWith?.('splash-handout-')) await app.close();
		}
	});
}

test('the compat layer registers in the Director and exposes the spectate API', async ({ pages: { gmPage } }) => {
	expect(await gmPage.evaluate(() => !!(globalThis as any).game.modules.get('obs-utils')?.active)).toBe(true);
	// The compat bundle loads via an async dynamic import after obs-utils.init, so poll for the registration.
	await expect.poll(
		() => gmPage.evaluate(() => !!(globalThis as any).game.modules.get('obs-utils')?.api?.directorTabs?.has?.('splash.director')),
		{ timeout: 10000 },
	).toBe(true);
	expect(await gmPage.evaluate(() => {
		const s = (globalThis as any).game.modules.get('splash')?.api;
		return typeof s?.openSpectator === 'function' && typeof s?.applySplashState === 'function';
	})).toBe(true);
});

test('the director pushes a handout onto the OBS client', async ({ pages: { gmPage, obsPage } }) => {
	const obsId = await userId(obsPage);
	const lockUuid = await uuidOf(gmPage, 'E2E Lock');
	await useRenderer(obsPage, 'html');
	try {
		// The same socket event the Director's "Show on stream" button emits.
		await gmPage.evaluate(({ uuid, target }) => {
			const g = globalThis as any;
			g.game.socket.emit('module.splash', { eventType: 'openHandout', targetUser: target, senderId: g.game.userId, payload: { uuid } });
		}, { uuid: lockUuid, target: obsId });
		await expect(obsPage.locator('.splash-handout')).toBeVisible();
	} finally {
		await closeHandouts(obsPage);
		await useRenderer(obsPage, 'webgl');
	}
});

test('the OBS client mirrors a player\'s local splash interaction', async ({ pages: { gmPage, obsPage, playerPage } }) => {
	const originalSpectated = await gmPage.evaluate(() => (globalThis as any).game.settings.get('splash', 'spectatedUser'));
	const playerPid = await userId(playerPage);
	const localUuid = await uuidOf(gmPage, 'E2E Local');
	await useRenderer(obsPage, 'html');
	await useRenderer(playerPage, 'html');
	try {
		await playerPage.evaluate(u => (globalThis as any).game.modules.get('splash').api.openHandout(u), localUuid);
		await expect(playerPage.locator('.splash-handout')).toBeVisible();

		// The Director selection is a world setting; wait for its change to reach the OBS client.
		await gmPage.evaluate(uid => (globalThis as any).game.settings.set('splash', 'spectatedUser', uid), playerPid);
		await expect.poll(() => obsPage.evaluate(() => (globalThis as any).game.settings.get('splash', 'spectatedUser'))).toBe(playerPid);

		// The player interacts; their presence snapshot broadcasts and the OBS client mirrors it.
		await playerPage.locator('.splash-handout').getByText('Set', { exact: true }).click();
		await expect(obsPage.locator('.splash-handout').getByText('Code: 1')).toBeVisible();
	} finally {
		await gmPage.evaluate(value => (globalThis as any).game.settings.set('splash', 'spectatedUser', value), originalSpectated);
		await closeHandouts(playerPage);
		await closeHandouts(obsPage);
		await useRenderer(obsPage, 'webgl');
		await useRenderer(playerPage, 'webgl');
	}
});
