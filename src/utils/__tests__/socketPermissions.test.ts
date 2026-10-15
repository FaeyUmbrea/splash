import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSocket } from '../socket.ts';

const playback = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('../../apps/overlay.ts', () => ({ openSplashOverlay: playback.open }));

/** A door whose binding and writes can be inspected without changing a world. */
class Wall {
	door = 1;
	getFlag = vi.fn((): string | undefined => 'page');
	update = vi.fn(async () => {});
}

let receive: (event: unknown, senderId: string) => Promise<void>;
let wall: Wall;
let page: { type: string; id: string; uuid: string; testUserPermission: ReturnType<typeof vi.fn> };
let calls: ReturnType<typeof vi.fn>;

/** Deliver a wall-open request using the identity supplied by Foundry's server. */
async function unlock(senderId = 'player'): Promise<void> {
	await receive({ eventType: 'unlockDoor', senderId: 'gm', payload: { doorUuid: 'wall' } }, senderId);
}

beforeEach(() => {
	vi.clearAllMocks();
	wall = new Wall();
	page = { type: 'splash.splash', id: 'page', uuid: 'page', testUserPermission: vi.fn(() => true) };
	calls = vi.fn();
	vi.stubGlobal('WallDocument', Wall);
	vi.stubGlobal('fromUuid', vi.fn(async (uuid: string) => uuid === 'wall' ? wall : page));
	vi.stubGlobal('CONST', { WALL_DOOR_STATES: { OPEN: 1 } });
	vi.stubGlobal('Hooks', { on: vi.fn(), call: calls });
	vi.stubGlobal('game', {
		userId: 'gm',
		user: { id: 'gm', isGM: true },
		users: { activeGM: { id: 'gm' }, get: (id: string) => ['gm', 'player'].includes(id) ? { id, isGM: id === 'gm' } : undefined },
		socket: { on: (_channel: string, listener: typeof receive) => { receive = listener; } },
	});
	registerSocket();
});
afterEach(() => vi.unstubAllGlobals());

describe('playback socket permissions', () => {
	it('ignores a forged GM sender ID when a player requests closing all splashes', async () => {
		await receive({ eventType: 'closeSplash', senderId: 'gm', payload: {} }, 'player');
		expect(calls).not.toHaveBeenCalled();
	});

	it('accepts a GM close using the verified identity even if the legacy field disagrees', async () => {
		await receive({ eventType: 'closeSplash', senderId: 'player', payload: { skipOutro: true } }, 'gm');
		expect(calls).toHaveBeenCalledWith('splash.close-splash', { skipOutro: true });
	});

	it('opens a bound door for a reader of its Splash page', async () => {
		await unlock();
		expect(wall.update).toHaveBeenCalledWith({ ds: 1 });
	});

	it('does not open an unrelated, unbound door for a player', async () => {
		wall.getFlag.mockReturnValue(undefined);
		await unlock();
		expect(wall.update).not.toHaveBeenCalled();
	});

	it('does not open a door when the player cannot read its bound Splash', async () => {
		page.testUserPermission.mockReturnValue(false);
		await unlock();
		expect(wall.update).not.toHaveBeenCalled();
	});

	it('keeps explicit GM-authored door actions working without a trigger binding', async () => {
		wall.getFlag.mockReturnValue(undefined);
		await unlock('gm');
		expect(wall.update).toHaveBeenCalledWith({ ds: 1 });
	});

	it('ignores malformed events and missing verified identities', async () => {
		await receive(null, 'gm');
		await receive({ eventType: 'closeSplash', payload: {} }, '');
		expect(calls).not.toHaveBeenCalled();
	});
});
