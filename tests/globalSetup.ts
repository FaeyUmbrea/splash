import process from 'node:process';
import { chromium } from '@playwright/test';
import { login } from './fixtures.ts';

/**
 * Seed the live world with the fixtures the suite needs, idempotently (by name, so re-runs are no-ops):
 * the two extra player users, a journal of test splashes (a local fullscreen one and a synced handout
 * "lock"), and a scene with a door. This is the world's baseline; tests must leave it in this state.
 *
 * The same seed makes any fresh world (e.g. a v14 copy) into a runnable test world — only the splash +
 * lib-wrapper modules need to be enabled first.
 */
export default async function globalSetup(): Promise<void> {
	const baseURL = process.env.TEST_URL ?? 'http://localhost:30001';
	const browser = await chromium.launch();
	const context = await browser.newContext({ baseURL });
	const page = await context.newPage();
	try {
		await login(page, 'Gamemaster');
		const summary = await page.evaluate(seed);
		// eslint-disable-next-line no-console
		console.log('[splash e2e seed]', JSON.stringify(summary));
	} finally {
		await browser.close();
	}
}

/** Runs in the browser as the GM. Pure globals (game/User/Scene/foundry/CONST) — no closures. */
async function seed(): Promise<Record<string, unknown>> {
	const g = globalThis as any;
	const { game, User, JournalEntry, Scene, CONST } = g;

	const ensureUser = async (name: string, role: number) => {
		if (![...game.users].some((u: any) => u.name === name)) await User.create({ name, role });
	};
	await ensureUser('Player2', CONST.USER_ROLES.PLAYER);
	await ensureUser('Player3', CONST.USER_ROLES.PLAYER);

	const button = (label: string, onClick: object) => ({
		type: 'button',
		name: label,
		label: { text: label, fontSize: 28, strokeThickness: 0, stroke: '#000000', fill: '#ffffff' },
		image: { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 },
		onClick,
		tint: '#3a6ea5',
		effects: [],
		states: { initial: { x: 200, y: 200, width: 240, height: 64 } },
	});
	// A text sprite that interpolates a synced value, so the runtime mirror is visually assertable.
	const valueText = (label: string, value: string) => ({
		type: 'text',
		name: label,
		text: value,
		font: 'Arial',
		size: 36,
		fillColor: '#ffffff',
		align: 'center',
		effects: [],
		states: { initial: { x: 200, y: 320, width: 400, height: 60 } },
	});

	let journal = game.journal.getName('E2E Splashes');
	if (!journal) journal = await JournalEntry.create({ name: 'E2E Splashes', ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
	// Upsert: refresh an existing page's structure to the canonical baseline so the suite's expectations hold.
	const ensurePage = async (name: string, system: { layer: string; mode: string; children: object[] }) => {
		const existing = journal.pages.getName(name);
		if (existing) await existing.update({ 'system.==children': system.children, 'system.layer': system.layer, 'system.mode': system.mode });
		else await journal.createEmbeddedDocuments('JournalEntryPage', [{ name, type: 'splash.splash', system }]);
	};
	await ensurePage('E2E Full', { layer: 'full', mode: 'local', children: [button('Close', { type: 'close' })] });
	await ensurePage('E2E Lock', { layer: 'handout', mode: 'synced', children: [button('Set', { type: 'set-value', key: 'code', value: '1' }), valueText('Code', 'Code: {code}')] });

	let scene = game.scenes.getName('E2E Scene');
	if (!scene) {
		scene = await Scene.create({ name: 'E2E Scene', width: 1000, height: 1000, padding: 0, grid: { size: 100 } });
		await scene.createEmbeddedDocuments('Wall', [{ c: [300, 300, 500, 300], door: 1, ds: 0 }]);
	}

	return {
		users: [...game.users].map((u: any) => u.name),
		fullUuid: journal.pages.getName('E2E Full')?.uuid,
		lockUuid: journal.pages.getName('E2E Lock')?.uuid,
		sceneId: scene.id,
		doorWallId: [...scene.walls].find((w: any) => (w.door ?? 0) > 0)?.id,
	};
}
