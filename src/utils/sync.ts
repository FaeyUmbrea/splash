import type { ActionInitialized, SplashInitialized } from '../datamodel/SplashModel.ts';
import type { RuntimeSnapshot, SplashRuntime } from '../renderer/SplashRuntime.ts';
import type { SharedSplashState } from './settings.ts';
import { ID } from './const.js';
import { getSharedStates, SETTING_SHARED_STATE } from './settings.ts';

/**
 * Synced-mode wiring. One shared state per page uuid lives in a world setting:
 * the GM client executes all actions and persists snapshots; player clients
 * forward their actions as socket intents and mirror the setting.
 */

interface ActionIntentEvent {
	eventType: 'splashActionIntent';
	senderId: string;
	payload: { uuid: string; action: ActionInitialized };
}

/** Synced runtimes currently open on this client, by page uuid. */
const syncedRuntimes = new Map<string, SplashRuntime>();

export interface SyncDriver {
	interceptAction: (action: ActionInitialized) => boolean;
	onChanged: (snapshot: RuntimeSnapshot) => void;
	/** Call after runtime.initialize(): adopts existing shared state and goes live. */
	connect: () => Promise<void>;
	dispose: () => void;
}

/** An action is only executable if the splash's own data declares it somewhere. */
export function isDeclaredAction(splash: SplashInitialized, action: ActionInitialized): boolean {
	const declared: unknown[] = [];
	for (const child of splash.children ?? []) {
		if (child?.type === 'button' && child.onClick) declared.push(child.onClick);
	}
	for (const state of Object.values(splash.states ?? {})) {
		declared.push(...(state?.onEnter ?? []));
	}
	return declared.some(candidate => foundry.utils.objectsEqual(candidate as object, action as object));
}

export function createSyncDriver(uuid: string, splash: SplashInitialized, runtime: SplashRuntime): SyncDriver {
	const isExecutor = () => game.users?.activeGM?.id === game.userId;
	let live = false;
	let persistTimer: ReturnType<typeof setTimeout> | undefined;

	const persist = (snapshot: RuntimeSnapshot) => {
		clearTimeout(persistTimer);
		persistTimer = setTimeout(() => {
			const states = { ...getSharedStates(), [uuid]: snapshot as SharedSplashState };
			game.settings?.set(ID, SETTING_SHARED_STATE, states);
		}, 100);
	};

	return {
		interceptAction: (action) => {
			if (isExecutor()) return false;
			game.socket?.emit(`module.${ID}`, {
				eventType: 'splashActionIntent',
				senderId: game.userId,
				payload: { uuid, action },
			} satisfies ActionIntentEvent);
			return true;
		},
		onChanged: (snapshot) => {
			if (live && isExecutor()) persist(snapshot);
		},
		connect: async () => {
			syncedRuntimes.set(uuid, runtime);
			const shared = getSharedStates()[uuid];
			if (shared) await runtime.applyShared(shared);
			live = true;
			// First opener seeds the shared state so late joiners see the same thing.
			if (!shared && isExecutor()) persist(runtime.snapshot);
		},
		dispose: () => {
			clearTimeout(persistTimer);
			if (syncedRuntimes.get(uuid) === runtime) syncedRuntimes.delete(uuid);
		},
	};
}

export function getSyncedRuntime(uuid: string): SplashRuntime | undefined {
	return syncedRuntimes.get(uuid);
}

/** Setting onChange: mirror the authoritative snapshots into open runtimes. */
export function onSharedStateChanged(states: Record<string, SharedSplashState>): void {
	// The executor's runtimes are the source of these snapshots, not mirrors.
	if (game.users?.activeGM?.id === game.userId) return;
	for (const [uuid, runtime] of syncedRuntimes) {
		const shared = states[uuid];
		if (shared) runtime.applyShared(shared);
	}
}

/** Socket listener: the executing GM validates and applies player intents. */
export function registerSyncSocket(): void {
	game.socket?.on(`module.${ID}`, async (event: ActionIntentEvent) => {
		if (event?.eventType !== 'splashActionIntent') return;
		if (game.users?.activeGM?.id !== game.userId) return;
		const { uuid, action } = event.payload ?? {};
		if (!uuid || !action) return;
		const runtime = syncedRuntimes.get(uuid);
		if (!runtime) return;
		// Reject anything the splash's data doesn't declare — intents are unauthenticated.
		const page = await fromUuid(uuid);
		const splash = (page as JournalEntryPage | null)?.system as SplashInitialized | undefined;
		if (!splash || !isDeclaredAction(splash, action)) return;
		await runtime.handleAction(action);
	});
}
