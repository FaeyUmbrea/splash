import type { SplashLayer } from './settings.ts';
import { openSplashOverlay } from '../apps/overlay.ts';
import { ID, PACKAGE_ID } from './const.js';
import { canTriggerSplash, canViewSplash, isSplashPage } from './launch.ts';
import { getObsUtilsModule } from './obsUtils.ts';

interface SplashSocketEvent {
	eventType: 'showSplash' | 'closeSplash' | 'openHandout' | 'closeHandout' | 'unlockDoor';
	/** Restrict the event to a single user; undefined means everyone. */
	targetUser?: string;
	senderId: string;
	payload: { uuid?: string; layer?: SplashLayer; skipOutro?: boolean; doorUuid?: string };
}

/** Open a real door on a GM client; player requests are limited to readable, trigger-bound Splash pages. */
async function unlockWall(doorUuid?: string, requester = game.user): Promise<void> {
	if (!game.user?.isGM || !requester || typeof doorUuid !== 'string' || !doorUuid) return;
	const wall = await fromUuid(doorUuid);
	if (!(wall instanceof WallDocument) || !wall.door) return;
	if (!requester.isGM) {
		const splashUuid = wall.getFlag(ID, 'launchSplash');
		if (typeof splashUuid !== 'string') return;
		const page = await fromUuid(splashUuid);
		if (!isSplashPage(page) || !canViewSplash(page, requester)) return;
	}
	await wall.update({ ds: CONST.WALL_DOOR_STATES.OPEN });
}

export function registerSocket(): void {
	game.socket?.on(`module.${PACKAGE_ID}`, handleEvent);
	Hooks.on('splash.unlock-door', (doorUuid?: string) => {
		if (game.user?.isGM) void unlockWall(doorUuid);
		else broadcastUnlockDoor(doorUuid);
	});
}

/** Handout stream events apply only on OBS/stream clients, which self-identify via OBS Utils. */
function isObsClient(): boolean {
	return getObsUtilsModule()?.api?.isOBS?.() ?? false;
}

/** Use the sender supplied by Foundry's server, never the legacy sender ID in a message body. */
async function handleEvent(event: SplashSocketEvent, senderId: string): Promise<void> {
	if (!event || !event.payload || typeof event.payload !== 'object' || typeof senderId !== 'string') return;
	const { eventType, targetUser, payload } = event;
	if (['showSplash', 'openHandout', 'closeHandout'].includes(eventType) && typeof payload.uuid !== 'string') return;
	if (!!targetUser && game.userId !== targetUser) return;
	const sender = game.users?.get(senderId);
	if (!sender) return;

	if (eventType === 'showSplash') {
		const page = await fromUuid(payload.uuid ?? '');
		if (!isSplashPage(page) || !canTriggerSplash(page, sender)) return;
		const layer = payload.layer === 'scene' || payload.layer === 'hud' ? payload.layer : 'full';
		await openSplashOverlay(page, { layer });
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
		const page = await fromUuid(payload.uuid ?? '');
		if (!sender.isGM || !isSplashPage(page)) return;
		const { closeHandout } = await import('../apps/handout.ts');
		await closeHandout(page.uuid);
	} else if (eventType === 'unlockDoor') {
		if (game.users?.activeGM?.id !== game.userId) return;
		await unlockWall(payload.doorUuid, sender);
	}
}

export function broadcastShowSplash(uuid: string, layer: SplashLayer = 'full', targetUser?: string): void {
	game.socket?.emit(`module.${PACKAGE_ID}`, {
		eventType: 'showSplash',
		targetUser,
		senderId: game.userId,
		payload: { uuid, layer },
	} satisfies SplashSocketEvent);
}

export function broadcastCloseSplash(targetUser?: string, skipOutro = false): void {
	game.socket?.emit(`module.${PACKAGE_ID}`, {
		eventType: 'closeSplash',
		targetUser,
		senderId: game.userId,
		payload: { skipOutro },
	} satisfies SplashSocketEvent);
}

/** Broadcast a handout open for the Director stream view. Only OBS-mode clients act on it. GM-only. */
export function broadcastOpenHandout(uuid: string): void {
	game.socket?.emit(`module.${PACKAGE_ID}`, {
		eventType: 'openHandout',
		senderId: game.userId,
		payload: { uuid },
	} satisfies SplashSocketEvent);
}

/** Broadcast a handout close. Only OBS-mode clients act on it. GM-only. */
export function broadcastCloseHandout(uuid: string): void {
	game.socket?.emit(`module.${PACKAGE_ID}`, {
		eventType: 'closeHandout',
		senderId: game.userId,
		payload: { uuid },
	} satisfies SplashSocketEvent);
}

/** Ask the GM to open a door, since players can't write wall documents. */
export function broadcastUnlockDoor(doorUuid?: string): void {
	game.socket?.emit(`module.${PACKAGE_ID}`, {
		eventType: 'unlockDoor',
		senderId: game.userId,
		payload: { doorUuid },
	} satisfies SplashSocketEvent);
}
