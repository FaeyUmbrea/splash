import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';
import { ID } from './const.js';

/** Players on local-mode splashes report their current state; the GM collects these and can spectate. */

interface PresenceEvent {
	eventType: 'splashPresence';
	senderId: string;
	payload: { uuid: string; snapshot: RuntimeSnapshot | null };
}

export interface PlayerPresence {
	uuid: string;
	snapshot: RuntimeSnapshot;
}

/** GM-side: latest reported position per user id. */
const presences = new Map<string, PlayerPresence>();

export function getPresences(): Map<string, PlayerPresence> {
	return new Map(presences);
}

export interface PresenceReporter {
	onChanged: (snapshot: RuntimeSnapshot) => void;
	dispose: () => void;
}

/** Player-side: throttled position reports while a local splash is open. */
export function createPresenceReporter(uuid: string): PresenceReporter {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const emit = (snapshot: RuntimeSnapshot | null) => {
		game.socket?.emit(`module.${ID}`, {
			eventType: 'splashPresence',
			senderId: game.userId,
			payload: { uuid, snapshot },
		} satisfies PresenceEvent);
	};

	return {
		onChanged: (snapshot) => {
			clearTimeout(timer);
			timer = setTimeout(emit, 500, snapshot);
		},
		dispose: () => {
			clearTimeout(timer);
			emit(null);
		},
	};
}

/** GM-side: collect reports and notify the control surface. */
export function registerPresenceSocket(): void {
	game.socket?.on(`module.${ID}`, (event: PresenceEvent) => {
		if (event?.eventType !== 'splashPresence') return;
		if (!game.user?.isGM) return;
		const { uuid, snapshot } = event.payload ?? {};
		if (!uuid) return;
		if (snapshot) presences.set(event.senderId, { uuid, snapshot });
		else presences.delete(event.senderId);
		Hooks.callAll('splash.presence-changed');
	});
}
