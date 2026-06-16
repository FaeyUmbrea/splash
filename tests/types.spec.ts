import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/**
 * Per-type coverage on one seeded handout ("E2E Types"). Forces the `html` renderer because only DOM sprites are
 * clickable; the draggable/drop-zone overlays are DOM in both renderers, so this exercises the same drag code path.
 * Each test restores the handout's runtime values afterwards.
 */

test.describe.configure({ mode: 'serial' });

async function openTypes(gmPage: Page): Promise<void> {
	await gmPage.evaluate(k => (globalThis as any).game.settings.set('splash', 'renderer', k), 'html');
	const uuid = await gmPage.evaluate(() => (globalThis as any).game.journal.getName('E2E Splashes').pages.getName('E2E Types').uuid);
	await gmPage.evaluate(u => (globalThis as any).game.modules.get('splash').api.openHandout(u), uuid);
	await expect(gmPage.locator('.splash-handout')).toBeVisible();
}

async function closeTypes(gmPage: Page): Promise<void> {
	await gmPage.evaluate(async () => {
		const g = globalThis as any;
		for (const app of [...g.foundry.applications.instances.values()]) {
			if (app.id?.startsWith?.('splash-handout-')) await app.close();
		}
		await g.game.journal.getName('E2E Splashes').pages.getName('E2E Types').update({ 'flags.splash.-=runtime': null });
	});
}

test('every sprite type renders in a handout', async ({ pages: { gmPage } }) => {
	await openTypes(gmPage);
	try {
		const h = gmPage.locator('.splash-handout');
		await expect(h.locator('img')).toBeVisible();
		await expect(h.locator('.splash-panel')).toBeVisible();
		await expect(h.locator('video')).toHaveCount(1);
		await expect(h.locator('.splash-gauge')).toBeVisible();
		await expect(h.locator('input.splash-text-input')).toBeVisible();
		await expect(h.locator('.splash-hotspot')).toBeVisible();
		await expect(h.locator('.splash-draggable')).toBeVisible();
		await expect(h.locator('[data-splash-dropzone]')).toBeVisible();
		await expect(h.getByText('Echo:', { exact: false })).toBeVisible();
	} finally {
		await closeTypes(gmPage);
	}
});

test('a gauge fill reacts to a value set by a button', async ({ pages: { gmPage } }) => {
	await openTypes(gmPage);
	try {
		const h = gmPage.locator('.splash-handout');
		await h.getByText('Fill', { exact: true }).click();
		await expect.poll(async () => gmPage.evaluate(() => {
			const fill = document.querySelector('.splash-handout .splash-gauge .fill') as HTMLElement;
			const gauge = document.querySelector('.splash-handout .splash-gauge') as HTMLElement;
			return Math.round((fill.getBoundingClientRect().width / gauge.getBoundingClientRect().width) * 100);
		})).toBe(80);
	} finally {
		await closeTypes(gmPage);
	}
});

test('typing into a text-input interpolates into a text sprite', async ({ pages: { gmPage } }) => {
	await openTypes(gmPage);
	try {
		const h = gmPage.locator('.splash-handout');
		await h.locator('input.splash-text-input').fill('opensesame');
		await expect(h.getByText('Echo: opensesame')).toBeVisible();
	} finally {
		await closeTypes(gmPage);
	}
});

test('a hotspot click runs its action', async ({ pages: { gmPage } }) => {
	await openTypes(gmPage);
	try {
		const h = gmPage.locator('.splash-handout');
		await h.locator('.splash-hotspot').click();
		await expect(h.getByText('Spot: hit')).toBeVisible();
	} finally {
		await closeTypes(gmPage);
	}
});

test('dragging a piece onto its drop zone records occupancy and fires onDrop', async ({ pages: { gmPage } }) => {
	await openTypes(gmPage);
	try {
		const h = gmPage.locator('.splash-handout');
		const piece = await h.locator('.splash-draggable').boundingBox();
		const zone = await h.locator('[data-splash-dropzone]').boundingBox();
		if (!piece || !zone) throw new Error('piece or zone not found');
		await gmPage.mouse.move(piece.x + piece.width / 2, piece.y + piece.height / 2);
		await gmPage.mouse.down();
		await gmPage.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 10 });
		await gmPage.mouse.up();
		await expect(h.getByText('Solved: yes')).toBeVisible();
	} finally {
		await closeTypes(gmPage);
	}
});
