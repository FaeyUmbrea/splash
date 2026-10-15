import type { Page } from '@playwright/test';
import process from 'node:process';
import { test as base, expect } from '@playwright/test';

/**
 * GM and Player in separate browser contexts so they're genuinely different Foundry sessions (for synced GM↔player flows).
 * The world is seeded once in globalSetup; tests that change world state must restore it.
 */

const PASSWORD = process.env.TEST_INSTALL_PASSWORD ?? '';

/** Log a context into the world as the named user and wait for the game to be ready. */
export async function login(page: Page, userLabel: string): Promise<void> {
	await page.goto('/join');
	await page.locator('select[name=userid], select[name=userId]').selectOption({ label: userLabel });
	await page.locator('input[name=password]').fill(PASSWORD);
	await page.locator('button[name=join]').click();
	await expect(page).toHaveURL(/\/(game|stream)$/);
	await page.waitForFunction(() => {
		const g = globalThis as any;
		return g.game?.ready === true && g.canvas?.ready && !g.canvas.loading;
	});
}

/** Start without shared answers, then restore the saved snapshots and GM scene view. */
async function preserveRuntime(page: Page): Promise<() => Promise<void>> {
	const viewedScene = await page.evaluate(() => (globalThis as any).canvas.scene.id as string);
	const snapshots = await page.evaluate(() => {
		const g = globalThis as any;
		return (g.game.journal.getName('E2E Splashes')?.pages.contents ?? []).map((document: any) => {
			const runtime = document.getFlag('splash', 'runtime');
			return { uuid: document.uuid, present: runtime !== undefined, runtime: runtime ?? null };
		});
	});
	await page.evaluate(async (saved) => {
		const g = globalThis as any;
		for (const snapshot of saved) await (await g.fromUuid(snapshot.uuid)).unsetFlag('splash', 'runtime');
	}, snapshots);
	return async () => {
		await page.evaluate(async (saved) => {
			const g = globalThis as any;
			for (const snapshot of saved) {
				const document = await g.fromUuid(snapshot.uuid);
				await document.unsetFlag('splash', 'runtime');
				if (snapshot.present) await document.setFlag('splash', 'runtime', snapshot.runtime);
			}
		}, snapshots);
		await page.waitForFunction(() => !(globalThis as any).canvas.loading);
		await page.evaluate(async (id) => {
			const g = globalThis as any;
			if (g.canvas.scene.id !== id) await g.game.scenes.get(id).view();
		}, viewedScene);
		await page.waitForFunction(id => (globalThis as any).canvas.scene.id === id && (globalThis as any).canvas.ready && !(globalThis as any).canvas.loading, viewedScene);
	};
}

export const test = base.extend<{ pages: { gmPage: Page; playerPage: Page } }>({
	pages: [async ({ browser }, use) => {
		const gmContext = await browser.newContext({ baseURL: process.env.TEST_URL ?? 'http://localhost:30001', viewport: { width: 1280, height: 800 } });
		const playerContext = await browser.newContext({ baseURL: process.env.TEST_URL ?? 'http://localhost:30001', viewport: { width: 1280, height: 800 } });
		const gmPage = await gmContext.newPage();
		const playerPage = await playerContext.newPage();
		let restore: (() => Promise<void>) | undefined;
		try {
			await login(gmPage, 'Gamemaster');
			await login(playerPage, 'Player2');
			restore = await preserveRuntime(gmPage);
			await use({ gmPage, playerPage });
		} finally {
			try {
				await restore?.();
			} finally {
				await Promise.all([gmContext.close(), playerContext.close()]);
			}
		}
	}, { scope: 'test', auto: false }],
});

/**
 * Three sessions for the OBS Utils integration: a GM (director), an OBS client (Player2, with `window.obsstudio`
 * injected so OBS Utils' isOBS() is true), and a player (Player3) whose local splash the OBS client mirrors.
 * Requires obs-utils and lib-wrapper enabled in the world.
 */
export const obsTest = base.extend<{ pages: { gmPage: Page; obsPage: Page; playerPage: Page } }>({
	pages: [async ({ browser }, use) => {
		const gmContext = await browser.newContext({ baseURL: process.env.TEST_URL ?? 'http://localhost:30001', viewport: { width: 1280, height: 800 } });
		const obsContext = await browser.newContext({ baseURL: process.env.TEST_URL ?? 'http://localhost:30001', viewport: { width: 1280, height: 800 } });
		await obsContext.addInitScript({ path: 'tests/initScripts/fakeobs.js' });
		const playerContext = await browser.newContext({ baseURL: process.env.TEST_URL ?? 'http://localhost:30001', viewport: { width: 1280, height: 800 } });
		const gmPage = await gmContext.newPage();
		const obsPage = await obsContext.newPage();
		const playerPage = await playerContext.newPage();
		let restore: (() => Promise<void>) | undefined;
		try {
			await Promise.all([
				login(gmPage, 'Gamemaster'),
				login(obsPage, 'Player2'),
				login(playerPage, 'Player3'),
			]);
			restore = await preserveRuntime(gmPage);
			await use({ gmPage, obsPage, playerPage });
		} finally {
			try {
				await restore?.();
			} finally {
				await Promise.all([gmContext.close(), obsContext.close(), playerContext.close()]);
			}
		}
	}, { scope: 'test', auto: false }],
});

export { expect };
