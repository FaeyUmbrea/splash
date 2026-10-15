import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const playback = vi.hoisted(() => ({ open: vi.fn(), apply: vi.fn(), close: vi.fn(), clear: vi.fn() }));
vi.mock('../../api/api.ts', () => ({ SplashAPI: { getInstance: () => ({ openSpectator: playback.open, applySplashState: playback.apply, closeSpectator: playback.close }) } }));
vi.mock('../../svelte/director/SplashDirectorTab.svelte', () => ({ default: {} }));
vi.mock('../../apps/overlay.ts', () => ({ closeSplashOverlay: playback.clear }));
vi.mock('../../utils/obsUtils.ts', () => ({ getObsUtilsModule: () => ({ api: { isOBS: () => true } }) }));
vi.mock('../../utils/settings.ts', () => ({ SETTING_OBS_LAST_STATE: 'obsLastState', SETTING_SPECTATED_USER: 'spectatedUser' }));

let receive: (event: unknown, senderId: string) => Promise<void>;
let permission: ReturnType<typeof vi.fn>;
const snapshot = { loadedStates: ['initial'], values: { answer: 'yes' }, overrides: {} };

/** Send one presence report through the OBS client's registered module receiver. */
async function presence(senderId: string, claimedSender = senderId, value: unknown = snapshot): Promise<void> {
	await receive({ eventType: 'splashPresence', senderId: claimedSender, payload: { uuid: 'page', snapshot: value } }, senderId);
}

beforeEach(async () => {
	vi.resetModules();
	vi.clearAllMocks();
	permission = vi.fn(() => true);
	vi.stubGlobal('fromUuid', vi.fn(async () => ({ type: 'splash.splash', id: 'page', uuid: 'page', system: { mode: 'local' }, testUserPermission: permission })));
	vi.stubGlobal('Hooks', { on: vi.fn() });
	vi.stubGlobal('foundry', { applications: { instances: new Map() } });
	vi.stubGlobal('game', {
		user: { id: 'obs', isGM: false },
		users: { get: (id: string) => ['watched', 'other', 'gm'].includes(id) ? { id, isGM: id === 'gm' } : undefined },
		settings: { get: (_scope: string, key: string) => key === 'spectatedUser' ? 'watched' : null, set: vi.fn() },
		socket: { on: (_channel: string, listener: typeof receive) => { receive = listener; } },
	});
	const { registerObsUtilsCompat } = await import('../obsUtils.ts');
	registerObsUtilsCompat();
});
afterEach(() => vi.unstubAllGlobals());

describe('oBS playback requests', () => {
	it('keeps the latest presence state when another report arrives during initial opening', async () => {
		let finishOpening!: () => void;
		playback.open.mockImplementationOnce(() => new Promise<void>((resolve) => {
			finishOpening = resolve;
		}));
		const opening = presence('watched');
		await vi.waitFor(() => expect(playback.open).toHaveBeenCalledOnce());
		const latest = { ...snapshot, values: { answer: 'new answer' } };
		const updating = presence('watched', 'watched', latest);
		finishOpening();
		await Promise.all([opening, updating]);
		expect(playback.apply).toHaveBeenLastCalledWith('page', latest);
	});

	it('mirrors the watched player using the verified sender even when the legacy field differs', async () => {
		await presence('watched', 'other');
		expect(playback.open).toHaveBeenCalledWith('page');
		expect(playback.apply).toHaveBeenCalledWith('page', snapshot);
	});

	it('finishes a clear request after an in-progress open without restoring its old cache', async () => {
		let finishOpening!: () => void;
		playback.open.mockImplementationOnce(() => new Promise<void>((resolve) => {
			finishOpening = resolve;
		}));
		const opening = presence('watched');
		await vi.waitFor(() => expect(playback.open).toHaveBeenCalledOnce());
		const clearing = receive({ eventType: 'splashClearStream' }, 'gm');
		finishOpening();
		await Promise.all([opening, clearing]);
		expect(playback.close).toHaveBeenCalledWith('page');
		expect(game.settings?.set).toHaveBeenLastCalledWith('splash', 'obsLastState', null);
	});

	it('retries opening on the next report after an opening failure', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			playback.open.mockRejectedValueOnce(new Error('asset unavailable'));
			await presence('watched');
			await presence('watched');
			expect(playback.open).toHaveBeenCalledTimes(2);
			expect(playback.apply).toHaveBeenCalledWith('page', snapshot);
		} finally {
			error.mockRestore();
		}
	});

	it('ignores another player claiming to be the watched player', async () => {
		await presence('other', 'watched');
		expect(playback.open).not.toHaveBeenCalled();
		expect(playback.apply).not.toHaveBeenCalled();
	});

	it('does not let a player clear the stream by claiming to be a GM', async () => {
		await receive({ eventType: 'splashClearStream', senderId: 'gm' }, 'other');
		expect(playback.clear).not.toHaveBeenCalled();
	});

	it('allows a verified GM to clear the stream', async () => {
		await presence('watched');
		await receive({ eventType: 'splashClearStream', senderId: 'other' }, 'gm');
		expect(playback.close).toHaveBeenCalledWith('page');
		expect(playback.clear).toHaveBeenCalledWith({ skipOutro: true });
	});

	it('does not mirror a page the watched player cannot read', async () => {
		permission.mockReturnValue(false);
		await presence('watched');
		expect(playback.open).not.toHaveBeenCalled();
	});

	it('ignores malformed presence snapshots', async () => {
		await presence('watched', 'watched', { ...snapshot, loadedStates: 'initial' });
		expect(playback.open).not.toHaveBeenCalled();
		expect(playback.apply).not.toHaveBeenCalled();
	});
});
