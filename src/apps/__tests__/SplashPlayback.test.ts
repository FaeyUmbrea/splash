import type { ActionInitialized, SplashInitialized } from '../../datamodel/SplashModel.ts';
import type { SvelteApplication } from '../../mixins/SvelteApplicationMixin.svelte.ts';
import type { SplashRenderer } from '../../renderer/SplashRenderer.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashAPI } from '../../api/api.ts';
import * as presence from '../../utils/presence.ts';
import * as settings from '../../utils/settings.ts';
import { SplashPlayback } from '../SplashPlayback.ts';

vi.mock('../../utils/settings.ts', () => ({ getActiveSplash: vi.fn(() => null) }));

const config = { children: [], initialState: ['initial'], states: { initial: { label: 'Initial', onEnter: [] } }, values: {} } as unknown as SplashInitialized;
const hooks = new Map<string, (...args: unknown[]) => void>();

/** A renderer whose startup and disposal can be controlled without a browser canvas. */
function renderer() {
	return {
		preload: vi.fn(async () => {}),
		addSprite: vi.fn(async () => undefined),
		animate: vi.fn(async () => {}),
		animationDuration: vi.fn(() => 0),
		destroy: vi.fn(),
	} satisfies SplashRenderer;
}

beforeEach(() => {
	hooks.clear();
	vi.stubGlobal('Hooks', {
		on: vi.fn((name, callback) => {
			hooks.set(name, callback);
			return hooks.size;
		}),
		off: vi.fn((name) => { hooks.delete(name); }),
		call: vi.fn(),
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('playback ownership', () => {
	it('ends the persisted global launch when its GM clicks an authored Close action', async () => {
		const uuid = 'JournalEntry.global.JournalEntryPage.full';
		vi.stubGlobal('game', { user: { isGM: true } });
		vi.spyOn(settings, 'getActiveSplash').mockReturnValue({ uuid, layer: 'full' });
		const close = vi.spyOn(SplashAPI.getInstance(), 'close').mockResolvedValue();
		const app = { id: 'splash-application', close: vi.fn() } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, renderer(), { app, pageUuid: uuid });
		try {
			await playback.start();
			await playback.runtime.handleAction({ type: 'close' });
			expect(close).toHaveBeenCalledExactlyOnceWith({ global: true });
			expect(app.close).not.toHaveBeenCalled();
		} finally {
			playback.dispose();
		}
	});

	it.each([
		{ name: 'a player', isGM: false, appId: 'splash-application', activeUuid: 'current' },
		{ name: 'a journal handout', isGM: true, appId: 'splash-handout-current', activeUuid: 'current' },
		{ name: 'a replaced global page', isGM: true, appId: 'splash-application', activeUuid: 'replacement' },
		{ name: 'a local overlay', isGM: true, appId: 'splash-application', activeUuid: null },
	])('keeps an authored Close local for $name', async ({ isGM, appId, activeUuid }) => {
		vi.stubGlobal('game', { user: { isGM } });
		vi.mocked(settings.getActiveSplash).mockReturnValue(activeUuid ? { uuid: activeUuid, layer: 'full' } : null);
		const close = vi.spyOn(SplashAPI.getInstance(), 'close').mockResolvedValue();
		const app = { id: appId, close: vi.fn() } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, renderer(), { app, pageUuid: 'current' });
		try {
			await playback.start();
			await playback.runtime.handleAction({ type: 'close' });
			expect(app.close).toHaveBeenCalledExactlyOnceWith({ skipOutro: false });
			expect(close).not.toHaveBeenCalled();
		} finally {
			playback.dispose();
		}
	});

	it('keeps preview closure and local close hooks separate from the global launch', async () => {
		vi.stubGlobal('game', { user: { isGM: true } });
		vi.mocked(settings.getActiveSplash).mockReturnValue({ uuid: 'current', layer: 'full' });
		const close = vi.spyOn(SplashAPI.getInstance(), 'close').mockResolvedValue();
		const onClose = vi.fn();
		const app = { id: 'splash-application', close: vi.fn() } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, renderer(), { app, pageUuid: 'current', onClose });
		try {
			await playback.start();
			await playback.runtime.handleAction({ type: 'close' });
			expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
			hooks.get('splash.close-splash')?.({ skipOutro: true });
			expect(onClose).toHaveBeenLastCalledWith(true);
			expect(close).not.toHaveBeenCalled();
		} finally {
			playback.dispose();
		}
	});

	it('reports adopted shared state to observers and presence without a local edit', async () => {
		const report = { onChanged: vi.fn(), dispose: vi.fn() };
		vi.spyOn(presence, 'createPresenceReporter').mockReturnValue(report);
		const onSnapshot = vi.fn();
		const app = { close: vi.fn() } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, renderer(), { app, pageUuid: 'JournalEntry.shared.JournalEntryPage.observed', onSnapshot });
		await playback.start();
		report.onChanged.mockClear();
		const shared = { loadedStates: ['initial'], values: { answer: 'accepted' }, overrides: {} };
		await playback.runtime.applyShared(shared);
		expect(report.onChanged).toHaveBeenCalledExactlyOnceWith(shared);
		expect(onSnapshot).toHaveBeenLastCalledWith(shared);
		playback.dispose();
		expect(report.dispose).toHaveBeenCalledOnce();
	});

	it('reports initial state, routes preview closure and removes its hooks exactly once', async () => {
		const drawing = renderer();
		const onClose = vi.fn();
		const onSnapshot = vi.fn();
		const app = { close: vi.fn(), onPreClose: undefined } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, drawing, { app, onClose, onSnapshot });
		expect(await playback.start()).toBe(true);
		expect(onSnapshot).toHaveBeenLastCalledWith({ loadedStates: ['initial'], values: {}, overrides: {} });
		hooks.get('splash.close-splash')?.({ skipOutro: true });
		expect(onClose).toHaveBeenCalledWith(true);
		playback.dispose();
		playback.dispose();
		expect(hooks.size).toBe(0);
		expect(drawing.destroy).toHaveBeenCalledOnce();
		expect(app.onPreClose).toBeUndefined();
	});

	it('preserves Foundry hook ownership so an unlock script can continue to close playback', async () => {
		vi.mocked(Hooks.call).mockImplementation(function (this: unknown) {
			// Foundry uses private static fields through its receiver when dispatching hooks.
			if (this !== Hooks) throw new TypeError('Missing hook dispatcher receiver');
			return true;
		});
		const onClose = vi.fn();
		const app = { close: vi.fn() } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, renderer(), { app, onClose });
		await playback.start();
		await playback.runtime.handleAction({ type: 'script', source: 'api.unlockDoor(\'Scene.test.Wall.door\'); api.close();' } as ActionInitialized);
		expect(Hooks.call).toHaveBeenCalledWith('splash.unlock-door', 'Scene.test.Wall.door');
		expect(onClose).toHaveBeenCalledWith(false);
		playback.dispose();
	});

	it('does not become ready or attach an outro after closing during startup', async () => {
		const drawing = renderer();
		let finish!: () => void;
		drawing.preload.mockImplementation(() => new Promise<void>((resolve) => {
			finish = resolve;
		}));
		const app = { close: vi.fn(), onPreClose: undefined } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, drawing, { app });
		const loading = playback.start();
		await vi.waitFor(() => expect(drawing.preload).toHaveBeenCalledOnce());
		playback.dispose();
		finish();
		expect(await loading).toBe(false);
		expect(app.onPreClose).toBeUndefined();
		expect(hooks.size).toBe(0);
	});

	it('cleans up a failed startup and preserves another owner’s close handler', async () => {
		const drawing = renderer();
		drawing.preload.mockRejectedValueOnce(new Error('preload failed'));
		const otherHandler = vi.fn();
		const app = { close: vi.fn(), onPreClose: otherHandler } as unknown as SvelteApplication;
		const playback = new SplashPlayback(config, drawing, { app });
		await expect(playback.start()).rejects.toThrow('preload failed');
		expect(drawing.destroy).toHaveBeenCalledOnce();
		expect(hooks.size).toBe(0);
		expect(app.onPreClose).toBe(otherHandler);
	});
});
