import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashAPI } from '../api.ts';

const playback = vi.hoisted(() => ({ open: vi.fn(), broadcast: vi.fn(), global: vi.fn() }));
vi.mock('../../apps/overlay.ts', () => ({ openSplashOverlay: playback.open }));
vi.mock('../../utils/socket.ts', () => ({ broadcastShowSplash: playback.broadcast }));
vi.mock('../../apps/controller.ts', () => ({ launchGlobalSplash: playback.global }));

/** Model a persisted page whose current player can observe but cannot control other clients. */
function observerPage() {
	return {
		type: 'splash.splash',
		id: 'page',
		uuid: 'JournalEntry.journal.JournalEntryPage.page',
		testUserPermission: vi.fn((_user, level: string) => level === 'OBSERVER'),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('game', { user: { id: 'player', isGM: false } });
	vi.stubGlobal('ui', { notifications: { warn: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());

describe('fullscreen launch permissions', () => {
	it('lets an observer open a fullscreen splash on their own client', async () => {
		const page = observerPage();
		vi.stubGlobal('fromUuid', vi.fn(async () => page));
		await new SplashAPI().show(page.uuid);
		expect(playback.open).toHaveBeenCalledWith(page, { layer: 'full' });
		expect(playback.broadcast).not.toHaveBeenCalled();
	});

	it.each([{ global: true }, { targetUser: 'other-player' }])('prevents an observer from controlling another client: %j', async (options) => {
		const page = observerPage();
		vi.stubGlobal('fromUuid', vi.fn(async () => page));
		await new SplashAPI().show(page.uuid, options);
		expect(playback.open).not.toHaveBeenCalled();
		expect(playback.broadcast).not.toHaveBeenCalled();
		expect(playback.global).not.toHaveBeenCalled();
	});

	it('does not open a local splash without read permission', async () => {
		const page = observerPage();
		page.testUserPermission.mockReturnValue(false);
		vi.stubGlobal('fromUuid', vi.fn(async () => page));
		await new SplashAPI().show(page.uuid);
		expect(playback.open).not.toHaveBeenCalled();
	});

	it('allows an owner to target another client', async () => {
		const page = observerPage();
		page.testUserPermission.mockReturnValue(true);
		vi.stubGlobal('fromUuid', vi.fn(async () => page));
		await new SplashAPI().show(page.uuid, { targetUser: 'other-player' });
		expect(playback.broadcast).toHaveBeenCalledWith(page.uuid, 'full', 'other-player');
		expect(playback.open).not.toHaveBeenCalled();
	});

	it('does not turn a non-GM owner’s global request into local playback', async () => {
		const page = observerPage();
		page.testUserPermission.mockReturnValue(true);
		vi.stubGlobal('fromUuid', vi.fn(async () => page));
		await new SplashAPI().show(page.uuid, { global: true });
		expect(playback.global).not.toHaveBeenCalled();
		expect(playback.open).not.toHaveBeenCalled();
	});

	it('does not restore a spectator view after read access has been revoked', async () => {
		const page = observerPage();
		page.testUserPermission.mockReturnValue(false);
		vi.stubGlobal('fromUuid', vi.fn(async () => page));
		await new SplashAPI().openSpectator(page.uuid);
		expect(playback.open).not.toHaveBeenCalled();
	});
});
