import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';
import { ID } from './const.js';

/** Players (and DMs) on an open splash report state so an OBS spectator client can mirror them. */

interface PresenceEvent {
	eventType: 'splashPresence';
	senderId: string;
	payload: { uuid: string; snapshot: RuntimeSnapshot | null };
}

export interface PresenceReporter {
	onChanged: (snapshot: RuntimeSnapshot) => void;
	dispose: () => void;
}

/** Player-side: throttled state reports while a splash is open, consumed by the OBS spectator mirror. */
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
