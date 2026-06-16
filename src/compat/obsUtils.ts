import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';
import { SplashAPI } from '../api/api.ts';
import SplashDirectorTab from '../svelte/director/SplashDirectorTab.svelte';
import { ID } from '../utils/const.js';

interface SpectateEvent {
	eventType: 'splashSpectate';
	targetUser?: string;
	senderId: string;
	payload: { userId: string | null };
}
interface PresenceEvent {
	eventType: 'splashPresence';
	senderId: string;
	payload: { uuid: string; snapshot: RuntimeSnapshot | null };
}

let spectatedUserId: string | null = null;
let openUuid: string | null = null;

/** Imported only when OBS Utils is present (see index.ts). Director tab for the GM; spectate mirror for the OBS client. */
export function registerObsUtilsCompat(): void {
	const api = game.modules?.get('obs-utils')?.api;
	if (!api) return;
	if (game.user?.isGM) {
		api.registerDirectorTab({ key: 'splash.director', label: 'splash.director.tabLabel', icon: 'fas fa-images', component: SplashDirectorTab, order: 100 });
	}
	if (api.isOBS()) registerSpectator();
}

/** Director: tell the OBS client which user's local splash to mirror on stream. null stops it. */
export function broadcastSpectate(userId: string | null, obsUserId: string): void {
	game.socket?.emit(`module.${ID}`, {
		eventType: 'splashSpectate',
		targetUser: obsUserId,
		senderId: game.userId,
		payload: { userId },
	} satisfies SpectateEvent);
}

/** OBS client: mirror the selected user's local-splash snapshots, which already broadcast over the presence channel. */
function registerSpectator(): void {
	game.socket?.on(`module.${ID}`, async (event: SpectateEvent | PresenceEvent) => {
		if (event?.eventType === 'splashSpectate') {
			if (event.targetUser && event.targetUser !== game.userId) return;
			spectatedUserId = event.payload.userId;
			if (!spectatedUserId) await closeSpectate();
			return;
		}
		if (event?.eventType === 'splashPresence' && spectatedUserId && event.senderId === spectatedUserId) {
			const { uuid, snapshot } = event.payload;
			if (!uuid || !snapshot) {
				await closeSpectate();
				return;
			}
			const api = SplashAPI.getInstance();
			if (openUuid !== uuid) {
				await closeSpectate();
				openUuid = uuid;
				await api.openSpectator(uuid);
			}
			await api.applySplashState(uuid, snapshot);
		}
	});
}

async function closeSpectate(): Promise<void> {
	if (!openUuid) return;
	const uuid = openUuid;
	openUuid = null;
	await SplashAPI.getInstance().closeSpectator(uuid);
}
