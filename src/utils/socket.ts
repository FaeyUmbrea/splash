import type { SplashLayer } from './settings.ts';
import { openSplashOverlay } from '../apps/overlay.ts';
import { ID } from './const.js';
import { canTriggerSplash, isSplashPage } from './launch.ts';

interface SplashSocketEvent {
	eventType: 'showSplash' | 'closeSplash';
	/** Restrict the event to a single user; undefined means everyone. */
	targetUser?: string;
	senderId: string;
	payload: { uuid?: string; layer?: SplashLayer; skipOutro?: boolean };
}

export function registerSocket(): void {
	game.socket?.on(`module.${ID}`, handleEvent);
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
