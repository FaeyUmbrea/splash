import process from 'node:process';
import { chromium } from '@playwright/test';
import { login } from './fixtures.ts';

/**
 * Seeds the world's baseline fixtures idempotently by name. Requires splash + lib-wrapper to be active.
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

/** Runs in the browser as the GM via page.evaluate, so it may only touch globals, no closures. */
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
	// A text sprite interpolating a synced value, making the runtime mirror visually assertable.
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

	// A text sprite at an explicit spot, interpolating a value (so an interactive sprite's effect is assertable).
	const echoText = (label: string, value: string, x: number, y: number) => ({
		type: 'text',
		name: label,
		text: value,
		font: 'Arial',
		size: 22,
		fillColor: '#ffffff',
		align: 'left',
		effects: [],
		states: { initial: { x, y, width: 360, height: 36 } },
	});
	const positionedButton = (label: string, onClick: object, x: number, y: number) => ({
		type: 'button',
		name: label,
		label: { text: label, fontSize: 22, strokeThickness: 0, stroke: '#000000', fill: '#ffffff' },
		image: { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 },
		onClick,
		tint: '#3a6ea5',
		effects: [],
		states: { initial: { x, y, width: 120, height: 44 } },
	});
	// One of every sprite type, each wired so its render and (for interactive ones) its behaviour can be asserted.
	const typesChildren = [
		{ type: 'image', name: 'Image', img: '', effects: [], states: { initial: { x: 20, y: 20, width: 110, height: 110 } } },
		{ type: 'panel', name: 'Panel', fill: '#3a6ea5', borderColor: '#ffffff', borderWidth: 2, radius: 6, effects: [], states: { initial: { x: 150, y: 20, width: 110, height: 110 } } },
		{ type: 'video', name: 'Video', src: '', loop: true, muted: true, autoplay: true, effects: [], states: { initial: { x: 280, y: 20, width: 160, height: 110 } } },
		{ type: 'gauge', name: 'Gauge', valueKey: 'level', min: 0, max: 100, fillColor: '#4caf50', bgColor: '#222831', vertical: false, effects: [], states: { initial: { x: 470, y: 30, width: 240, height: 28 } } },
		positionedButton('Fill', { type: 'set-value', key: 'level', value: '80' }, 470, 70),
		{ type: 'text-input', name: 'Input', valueKey: 'typed', placeholder: 'type here', fontSize: 18, color: '#ffffff', bgColor: '#1b1b1e', effects: [], states: { initial: { x: 20, y: 170, width: 240, height: 40 } } },
		echoText('Echo', 'Echo: {typed}', 20, 220),
		{ type: 'hotspot', name: 'Spot', onClick: { type: 'set-value', key: 'spot', value: 'hit' }, effects: [], states: { initial: { x: 300, y: 170, width: 140, height: 80 } } },
		echoText('SpotText', 'Spot: {spot}', 300, 260),
		{ type: 'draggable', name: 'Piece', valueKey: 'keySlot', tag: 'key', img: '', fill: '#e91e63', radius: 8, effects: [], states: { initial: { x: 40, y: 360, width: 80, height: 80 } } },
		{ type: 'drop-zone', name: 'Zone', accepts: 'key', onDrop: { type: 'set-value', key: 'solved', value: 'yes' }, fill: '#22283155', borderColor: '#ffffff', borderWidth: 2, radius: 8, highlightColor: '#4caf50', effects: [], states: { initial: { x: 320, y: 340, width: 120, height: 120 } } },
		echoText('SolvedText', 'Solved: {solved}', 320, 480),
	];

	let journal = game.journal.getName('E2E Splashes');
	if (!journal) journal = await JournalEntry.create({ name: 'E2E Splashes', ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
	// Upsert: reset an existing page's structure to the canonical baseline.
	const ensurePage = async (name: string, system: { layer: string; mode: string; children: object[]; handoutSize?: object }) => {
		const existing = journal.pages.getName(name);
		if (existing) {
			const update: Record<string, unknown> = { 'system.==children': system.children, 'system.layer': system.layer, 'system.mode': system.mode };
			if (system.handoutSize) update['system.==handoutSize'] = system.handoutSize;
			await existing.update(update);
		} else {
			await journal.createEmbeddedDocuments('JournalEntryPage', [{ name, type: 'splash.splash', system }]);
		}
	};
	await ensurePage('E2E Full', { layer: 'full', mode: 'local', children: [button('Close', { type: 'close' })] });
	await ensurePage('E2E Lock', { layer: 'handout', mode: 'synced', children: [button('Set', { type: 'set-value', key: 'code', value: '1' }), valueText('Code', 'Code: {code}')] });
	// A local (non-shared) handout, for the OBS spectate test: a player drives it and the OBS client mirrors it.
	await ensurePage('E2E Local', { layer: 'handout', mode: 'local', children: [button('Set', { type: 'set-value', key: 'code', value: '1' }), valueText('Code', 'Code: {code}')] });
	// Every sprite type on one handout, for the per-type render/interaction suite.
	await ensurePage('E2E Types', { layer: 'handout', mode: 'local', handoutSize: { width: 760, height: 540 }, children: typesChildren });

	let scene = game.scenes.getName('E2E Scene');
	if (!scene) {
		scene = await Scene.create({ name: 'E2E Scene', width: 1000, height: 1000, padding: 0, grid: { size: 100 } });
		await scene.createEmbeddedDocuments('Wall', [{ c: [300, 300, 500, 300], door: 1, ds: 0 }]);
	}

	return {
		users: [...game.users].map((u: any) => u.name),
		fullUuid: journal.pages.getName('E2E Full')?.uuid,
		lockUuid: journal.pages.getName('E2E Lock')?.uuid,
		typesUuid: journal.pages.getName('E2E Types')?.uuid,
		sceneId: scene.id,
		doorWallId: [...scene.walls].find((w: any) => (w.door ?? 0) > 0)?.id,
	};
}
