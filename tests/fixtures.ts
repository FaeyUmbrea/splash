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
	await page.locator('select[name="userid"]').selectOption({ label: userLabel });
	await page.locator('input[name=password]').fill(PASSWORD);
	await page.getByRole('button', { name: 'Join Game Session' }).click();
	await expect(page).toHaveURL(/\/(game|stream)$/);
	await page.waitForFunction(() => (globalThis as { game?: { ready?: boolean } }).game?.ready === true);
}

export const test = base.extend<{ pages: { gmPage: Page; playerPage: Page } }>({
	pages: [async ({ browser }, use) => {
		const gmContext = await browser.newContext();
		const playerContext = await browser.newContext();
		const gmPage = await gmContext.newPage();
		const playerPage = await playerContext.newPage();
		await login(gmPage, 'Gamemaster');
		await login(playerPage, 'Player2');
		await use({ gmPage, playerPage });
		await gmContext.close();
		await playerContext.close();
	}, { scope: 'test', auto: false }],
});

export { expect };
