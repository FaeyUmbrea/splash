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

/** Runtimes currently open on this client, by page uuid (synced and local alike). */
const openRuntimes = new Map<string, SplashRuntime>();

export function registerRuntime(uuid: string, runtime: SplashRuntime): void {
	openRuntimes.set(uuid, runtime);
}

export function unregisterRuntime(uuid: string, runtime: SplashRuntime): void {
	if (openRuntimes.get(uuid) === runtime) openRuntimes.delete(uuid);
}

export function getRuntime(uuid: string): SplashRuntime | undefined {
	return openRuntimes.get(uuid);
}

/** Vote ledgers per synced splash, GM-side only: uuid → userId → optionId. */
const voteLedgers = new Map<string, Map<string, string>>();

/** Every vote option a splash declares on its buttons. */
function declaredVoteOptions(splash: SplashInitialized): string[] {
	const options: string[] = [];
	for (const child of splash.children ?? []) {
		if (child?.type === 'button' && child.onClick?.type === 'vote' && child.onClick.optionId) {
			options.push(child.onClick.optionId);
		}
	}
	return options;
}

/** GM-side: record a player's vote and surface tallies according to visibility. */
async function recordVote(uuid: string, userId: string, optionId: string, splash: SplashInitialized, runtime: SplashRuntime): Promise<void> {
	const ledger = voteLedgers.get(uuid) ?? new Map<string, string>();
	ledger.set(userId, optionId);
	voteLedgers.set(uuid, ledger);
	if (splash.voteVisibility === 'all') {
		for (const option of declaredVoteOptions(splash)) {
			const count = [...ledger.values()].filter(choice => choice === option).length;
			// Tallies ride the regular value pipeline: persisted, mirrored, and
			// displayable via {vote:option} interpolation.
			await runtime.handleAction({ type: 'set-value', key: `vote:${option}`, value: String(count) } as ActionInitialized);
		}
	}
	Hooks.callAll('splash.votes-changed', uuid, getVotes(uuid));
}

/** Current tallies with voter names, for the GM control surface. */
export function getVotes(uuid: string): Record<string, { count: number; voters: string[] }> {
	const tallies: Record<string, { count: number; voters: string[] }> = {};
	for (const [userId, optionId] of voteLedgers.get(uuid) ?? []) {
		tallies[optionId] ??= { count: 0, voters: [] };
		tallies[optionId].count += 1;
		tallies[optionId].voters.push(game.users?.get(userId)?.name ?? userId);
	}
	return tallies;
}

/** All current tallies by page uuid, for control-surface mounting. */
export function getAllVotes(): Record<string, Record<string, { count: number; voters: string[] }>> {
	const board: Record<string, Record<string, { count: number; voters: string[] }>> = {};
	for (const uuid of voteLedgers.keys()) {
		board[uuid] = getVotes(uuid);
	}
	return board;
}

/** GM: wipe a splash's votes (and zero visible tallies). */
export async function clearVotes(uuid: string): Promise<void> {
	voteLedgers.delete(uuid);
	const runtime = openRuntimes.get(uuid);
	const page = await fromUuid(uuid);
	const splash = (page as JournalEntryPage | null)?.system as SplashInitialized | undefined;
	if (runtime && splash?.voteVisibility === 'all') {
		for (const option of declaredVoteOptions(splash)) {
			await runtime.handleAction({ type: 'set-value', key: `vote:${option}`, value: '0' } as ActionInitialized);
		}
	}
	Hooks.callAll('splash.votes-changed', uuid, {});
}

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
			if (isExecutor()) {
				// Votes need attribution, which the runtime doesn't know about.
				if (action.type === 'vote') {
					recordVote(uuid, game.userId ?? '', action.optionId ?? '', splash, runtime);
					return true;
				}
				return false;
			}
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
			const shared = getSharedStates()[uuid];
			if (shared) await runtime.applyShared(shared);
			live = true;
			// First opener seeds the shared state so late joiners see the same thing.
			if (!shared && isExecutor()) persist(runtime.snapshot);
		},
		dispose: () => {
			clearTimeout(persistTimer);
		},
	};
}

/** Setting onChange: mirror the authoritative snapshots into open runtimes. */
export function onSharedStateChanged(states: Record<string, SharedSplashState>): void {
	// The executor's runtimes are the source of these snapshots, not mirrors.
	if (game.users?.activeGM?.id === game.userId) return;
	for (const [uuid, runtime] of openRuntimes) {
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
		const runtime = openRuntimes.get(uuid);
		if (!runtime) return;
		// Reject anything the splash's data doesn't declare — intents are unauthenticated.
		const page = await fromUuid(uuid);
		const splash = (page as JournalEntryPage | null)?.system as SplashInitialized | undefined;
		if (!splash || !isDeclaredAction(splash, action)) return;
		if (action.type === 'vote') {
			await recordVote(uuid, event.senderId, action.optionId ?? '', splash, runtime);
			return;
		}
		await runtime.handleAction(action);
	});
}
