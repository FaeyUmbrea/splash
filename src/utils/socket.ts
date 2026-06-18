import type { SplashLayer } from './settings.ts';
import { openSplashOverlay } from '../apps/overlay.ts';
import { ID } from './const.js';
import { canTriggerSplash, canViewSplash, isSplashPage } from './launch.ts';

interface SplashSocketEvent {
	eventType: 'showSplash' | 'closeSplash' | 'openHandout' | 'closeHandout' | 'unlockDoor';
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
	Hooks.on('splash.unlock-door', (doorUuid?: string) => {
		if (game.user?.isGM) void unlockWall(doorUuid);
		else broadcastUnlockDoor(doorUuid);
	});
}

/** Handout stream events apply only on OBS/stream clients, which self-identify via OBS Utils. */
function isObsClient(): boolean {
	return game.modules?.get('obs-utils')?.api?.isOBS?.() ?? false;
}

async function handleEvent({ eventType, targetUser, senderId, payload }: SplashSocketEvent): Promise<void> {
	if (!!targetUser && game.userId !== targetUser) return;
	const sender = game.users?.get(senderId);
	if (!sender) return;

	if (eventType === 'showSplash') {
		const page = await fromUuid(payload.uuid ?? '');
		if (!isSplashPage(page) || !canTriggerSplash(page, sender)) return;
		await openSplashOverlay(page, { layer: payload.layer ?? 'full' });
	} else if (eventType === 'closeSplash') {
		if (!sender.isGM) return;
		Hooks.call('splash.close-splash', { skipOutro: payload.skipOutro });
	} else if (eventType === 'openHandout') {
		if (!isObsClient()) return;
		const page = await fromUuid(payload.uuid ?? '');
		if (!sender.isGM || !isSplashPage(page) || !canViewSplash(page, game.user)) return;
		const { openHandout } = await import('../apps/handout.ts');
		await openHandout(page);
	} else if (eventType === 'closeHandout') {
		if (!isObsClient()) return;
		const page = await fromUuid(payload.uuid ?? '') as JournalEntryPage | null;
		if (!sender.isGM || !page) return;
		await foundry.applications.instances.get(`splash-handout-${page.id}`)?.close();
	} else if (eventType === 'unlockDoor') {
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

/** Broadcast a handout open for the Director stream view. Only OBS-mode clients act on it. GM-only. */
export function broadcastOpenHandout(uuid: string): void {
	game.socket?.emit(`module.${ID}`, {
		eventType: 'openHandout',
		senderId: game.userId,
		payload: { uuid },
	} satisfies SplashSocketEvent);
}

/** Broadcast a handout close. Only OBS-mode clients act on it. GM-only. */
export function broadcastCloseHandout(uuid: string): void {
	game.socket?.emit(`module.${ID}`, {
		eventType: 'closeHandout',
		senderId: game.userId,
		payload: { uuid },
	} satisfies SplashSocketEvent);
}

/** Ask the GM to open a door, since players can't write wall documents. */
export function broadcastUnlockDoor(doorUuid?: string): void {
	game.socket?.emit(`module.${ID}`, {
		eventType: 'unlockDoor',
		senderId: game.userId,
		payload: { doorUuid },
	} satisfies SplashSocketEvent);
}
