import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** Create a disposable two-state handout without rewriting the world's existing fixtures. */
async function createHandout(page: Page): Promise<string> {
	return page.evaluate(async () => {
		const g = globalThis as any;
		/** Place each control in a separate, predictable pointer target. */
		const placement = (y: number) => ({ x: 20, y, width: 200, height: 44 });
		/** Build a complete button document for the real Foundry schema. */
		const button = (id: string, text: string, state: string, y: number, onClick: object) => ({
			id,
			type: 'button',
			name: text,
			label: { text, fontSize: 22, fill: '#ffffff', stroke: '#000000', strokeThickness: 0 },
			image: { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 },
			tint: '#3a6ea5',
			onClick,
			states: { [state]: placement(y) },
		});
		const journal = await g.JournalEntry.create({
			name: 'Splash automated playback regression',
			ownership: { default: g.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
			pages: [{
				name: 'Gated handout',
				type: 'splash.splash',
				ownership: { default: g.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
				system: {
					layer: 'handout',
					mode: 'local',
					handoutSize: { width: 400, height: 320 },
					initialState: ['initial'],
					states: { initial: { label: 'Initial', onEnter: [] }, revealed: { label: 'Revealed', onEnter: [] } },
					children: [
						button('answer', 'Answer', 'initial', 20, { type: 'set-value', key: 'answer', value: 'yes' }),
						button('reveal', 'Reveal', 'initial', 80, { type: 'change-state', load: ['revealed'], unload: ['initial'], conditions: { answer: 'yes' } }),
						button('close', 'Close revealed', 'revealed', 180, { type: 'close' }),
					],
				},
			}],
		});
		return journal.pages.contents[0].uuid;
	});
}

/** Open through the public API, leaving all actions to actual pointer input. */
async function openHandout(page: Page, uuid: string): Promise<void> {
	await expect.poll(() => page.evaluate(async u => !!(await (globalThis as any).fromUuid(u))?.testUserPermission((globalThis as any).game.user, 'OBSERVER'), uuid)).toBe(true);
	await page.evaluate(u => (globalThis as any).game.modules.get('splash').api.openHandout(u), uuid);
	await expect(page.locator('.splash-handout')).toBeVisible();
	await expect(page.locator('.splash-handout .loading')).toHaveCount(0);
}

for (const renderer of ['html', 'webgl'] as const) {
	test(`${renderer}: a player completes a gated transition and reopening resets local playback`, async ({ pages: { gmPage, playerPage } }, testInfo) => {
		const original = await playerPage.evaluate(() => (globalThis as any).game.settings.get('splash', 'renderer'));
		let uuid: string | undefined;
		try {
			uuid = await createHandout(gmPage);
			await playerPage.evaluate(k => (globalThis as any).game.settings.set('splash', 'renderer', k), renderer);
			await openHandout(playerPage, uuid);
			const stage = playerPage.locator('.splash-handout .splash-stage');
			if (renderer === 'webgl') await expect(stage.locator('canvas')).toBeVisible();
			else await expect(stage.getByText('Answer', { exact: true })).toBeVisible();
			// Close exists only in the gated destination. An early Reveal must leave Initial active.
			await stage.click({ position: { x: 100, y: 100 } });
			await stage.click({ position: { x: 100, y: 200 } });
			await expect(playerPage.locator('.splash-handout')).toBeVisible();
			if (renderer === 'html') await expect(stage.getByText('Close revealed', { exact: true })).toHaveCount(0);
			await stage.click({ position: { x: 100, y: 40 } });
			await stage.click({ position: { x: 100, y: 100 } });
			if (renderer === 'html') await expect(stage.getByText('Close revealed', { exact: true })).toBeVisible();
			await testInfo.attach(`${renderer}-revealed`, { body: await stage.screenshot(), contentType: 'image/png' });
			await stage.click({ position: { x: 100, y: 200 } });
			await expect(playerPage.locator('.splash-handout')).toHaveCount(0);
			await openHandout(playerPage, uuid);
			await stage.click({ position: { x: 100, y: 100 } });
			await stage.click({ position: { x: 100, y: 200 } });
			await expect(playerPage.locator('.splash-handout')).toBeVisible();
			if (renderer === 'html') await expect(stage.getByText('Answer', { exact: true })).toBeVisible();
		} finally {
			await playerPage.evaluate(async ({ pageUuid, kind }) => {
				const g = globalThis as any;
				if (pageUuid) await g.foundry.applications.instances.get(`splash-handout-${pageUuid}`)?.close();
				await g.game.settings.set('splash', 'renderer', kind);
			}, { pageUuid: uuid, kind: original });
			if (uuid) await gmPage.evaluate(async u => (await (globalThis as any).fromUuid(u)).parent.delete(), uuid);
		}
	});
}

test('player token entry opens a region-bound handout only on the initiating client', async ({ pages: { gmPage, playerPage } }) => {
	const uuid = await createHandout(gmPage);
	const fixture = await gmPage.evaluate(async (splashUuid) => {
		const g = globalThis as any;
		const scene = g.game.scenes.getName('E2E Scene');
		const previous = { activeScene: g.game.scenes.active.id, viewedScene: g.canvas.scene.id, tokenVision: scene.tokenVision, paused: g.game.paused };
		const player = g.game.users.getName('Player2');
		const actor = await g.Actor.create({ name: 'Splash automated region actor', type: 'npc', ownership: { [player.id]: g.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
		let token: any;
		let region: any;
		try {
			[token] = await scene.createEmbeddedDocuments('Token', [{ name: actor.name, actorId: actor.id, x: 200, y: 200, width: 1, height: 1, texture: { src: 'icons/svg/mystery-man.svg' } }]);
			[region] = await scene.createEmbeddedDocuments('Region', [{ name: 'Splash automated region', shapes: [{ type: 'rectangle', x: 300, y: 200, width: 200, height: 200 }], behaviors: [{ type: 'splash.launchSplash', name: 'Launch Splash', system: { splashUuid } }] }]);
			await scene.update({ tokenVision: false });
			await scene.activate();
			await g.game.togglePause(false, { broadcast: true });
			return { ...previous, sceneId: scene.id, actorId: actor.id, tokenId: token.id, regionId: region.id };
		} catch (error) {
			await token?.delete();
			await region?.delete();
			await actor.delete();
			await scene.update({ tokenVision: previous.tokenVision });
			await g.game.scenes.get(previous.activeScene).activate();
			if (previous.viewedScene !== previous.activeScene) await g.game.scenes.get(previous.viewedScene).view();
			await g.game.togglePause(previous.paused, { broadcast: true });
			throw error;
		}
	}, uuid).catch(async (error) => {
		await gmPage.evaluate(async u => (await (globalThis as any).fromUuid(u))?.parent.delete(), uuid);
		throw error;
	});
	try {
		await playerPage.waitForFunction(id => (globalThis as any).canvas?.scene?.id === id && (globalThis as any).canvas?.ready && !(globalThis as any).canvas.loading, fixture.sceneId);
		const points = await playerPage.evaluate((id) => {
			const g = globalThis as any;
			const token = g.canvas.tokens.get(id);
			const start = g.canvas.stage.worldTransform.apply(token.center);
			return { start: { x: start.x, y: start.y } };
		}, fixture.tokenId);
		await playerPage.mouse.click(points.start.x, points.start.y);
		await expect.poll(() => playerPage.evaluate(id => (globalThis as any).canvas.tokens.get(id).controlled, fixture.tokenId)).toBe(true);
		await playerPage.keyboard.press('d', { delay: 100 });
		await expect.poll(() => playerPage.evaluate(id => (globalThis as any).canvas.tokens.get(id).document.x, fixture.tokenId)).toBe(300);
		await expect(playerPage.locator('.splash-handout')).toBeVisible();
		await expect(gmPage.locator('.splash-handout')).toHaveCount(0);
		await expect.poll(() => playerPage.evaluate(u => (globalThis as any).game.modules.get('splash').api.getSplashState(u), uuid)).not.toBeNull();
	} finally {
		await playerPage.evaluate(async u => (globalThis as any).foundry.applications.instances.get(`splash-handout-${u}`)?.close(), uuid);
		await gmPage.evaluate(async ({ saved, splashUuid }) => {
			const g = globalThis as any;
			const scene = g.game.scenes.get(saved.sceneId);
			await scene.deleteEmbeddedDocuments('Token', [saved.tokenId]);
			await scene.deleteEmbeddedDocuments('Region', [saved.regionId]);
			await g.game.actors.get(saved.actorId).delete();
			await scene.update({ tokenVision: saved.tokenVision });
			await g.game.scenes.get(saved.activeScene).activate();
			if (saved.viewedScene !== saved.activeScene) await g.game.scenes.get(saved.viewedScene).view();
			await g.game.togglePause(saved.paused, { broadcast: true });
			await (await g.fromUuid(splashUuid)).parent.delete();
		}, { saved: fixture, splashUuid: uuid });
	}
});
