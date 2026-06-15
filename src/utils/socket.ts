import type { SplashLayer } from './settings.ts';
import { openSplashOverlay } from '../apps/overlay.ts';
import { ID } from './const.js';
import { canTriggerSplash, isSplashPage } from './launch.ts';

interface SplashSocketEvent {
	eventType: 'showSplash' | 'closeSplash' | 'unlockDoor';
	/** Restrict the event to a single user; undefined means everyone. */
	targetUser?: string;
	senderId: string;
	payload: { uuid?: string; layer?: SplashLayer; skipOutro?: boolean; doorUuid?: string };
}

/** Open the wall as if its lock were solved. GM-only (players can't write wall documents). */
async function unlockWall(doorUuid?: string): Promise<void> {
	if (!game.user?.isGM || !doorUuid) return;
	const wall = await fromUuid(doorUuid) as { update?: (d: object) => Promise<unknown> } | null;
	await wall?.update?.({ ds: CONST.WALL_DOOR_STATES.OPEN });
}

export function registerSocket(): void {
	game.socket?.on(`module.${ID}`, handleEvent);
	// A solved in-splash lock asks its door to open; the GM (here or via the socket below) does the write.
	Hooks.on('splash.unlock-door', (doorUuid?: string) => {
		if (game.user?.isGM) void unlockWall(doorUuid);
		else broadcastUnlockDoor(doorUuid);
	});
}

async function handleEvent({ eventType, targetUser, senderId, payload }: SplashSocketEvent): Promise<void> {
	if (!!targetUser && game.userId !== targetUser) return;
	const sender = game.users?.get(senderId);
	if (!sender) return;

	if (eventType === 'showSplash') {
		const page = await fromUuid(payload.uuid ?? '');
		// Only honor senders that are actually allowed to trigger this splash.
		if (!isSplashPage(page) || !canTriggerSplash(page, sender)) return;
		await openSplashOverlay(page, { layer: payload.layer ?? 'full' });
	} else if (eventType === 'closeSplash') {
		if (!sender.isGM) return;
		Hooks.call('splash.close-splash', { skipOutro: payload.skipOutro });
	} else if (eventType === 'unlockDoor') {
		// Any player who solved the lock may request it; only the GM actually writes the wall.
		await unlockWall(payload.doorUuid);
	}
}

export function broadcastShowSplash(uuid: string, layer: SplashLayer = 'full', targetUser?: string): void {
	game.socket?.emit(`module.${ID}`, {
		eventType: 'showSplash',
		targetUser,
		senderId: game.userId,
		payload: { uuid, layer },
	} satisfies SplashSocketEvent);
}

export function broadcastCloseSplash(targetUser?: string, skipOutro = false): void {
	game.socket?.emit(`module.${ID}`, {
		eventType: 'closeSplash',
		targetUser,
		senderId: game.userId,
		payload: { skipOutro },
	} satisfies SplashSocketEvent);
}

/** Ask the GM to open a door (a player solved its lock). */
export function broadcastUnlockDoor(doorUuid?: string): void {
	game.socket?.emit(`module.${ID}`, {
		eventType: 'unlockDoor',
		senderId: game.userId,
		payload: { doorUuid },
	} satisfies SplashSocketEvent);
}
