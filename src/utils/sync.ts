import type { ActionInitialized, SplashInitialized } from '../datamodel/SplashModel.ts';
import type { RuntimeSnapshot, SplashRuntime } from '../renderer/SplashRuntime.ts';
import { ID } from './const.js';

/**
 * Synced-mode wiring. A synced splash's runtime snapshot lives in a page flag synced by Foundry. Only a GM
 * can write it, so player edits run locally and proxy to the GM, who validates and persists. Votes forward
 * as intents so the GM keeps per-user attribution.
 */

const FLAG_RUNTIME = 'runtime';

interface ActionIntentEvent {
	eventType: 'splashActionIntent';
	senderId: string;
	payload: { uuid: string; action: ActionInitialized; sourceId?: string };
}

/** A non-GM's snapshot proxied to the GM to persist on the page flag. */
interface StateProxyEvent {
	eventType: 'splashStateProxy';
	senderId: string;
	payload: { uuid: string; snapshot: RuntimeSnapshot };
}

/** Open runtimes on this client, by page uuid. */
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

function declaredVoteOptions(splash: SplashInitialized): string[] {
	const options: string[] = [];
	for (const child of splash.children ?? []) {
		if (child?.type === 'button' && child.onClick?.type === 'vote' && child.onClick.optionId) {
			options.push(child.onClick.optionId);
		}
	}
	return options;
}

/** GM-side: record a vote and surface tallies per visibility. */
async function recordVote(uuid: string, userId: string, optionId: string, splash: SplashInitialized, runtime: SplashRuntime): Promise<void> {
	const ledger = voteLedgers.get(uuid) ?? new Map<string, string>();
	ledger.set(userId, optionId);
	voteLedgers.set(uuid, ledger);
	if (splash.voteVisibility === 'all') {
		for (const option of declaredVoteOptions(splash)) {
			const count = [...ledger.values()].filter(choice => choice === option).length;
			// Tallies ride the value pipeline; {vote:option} interpolation then displays them.
			await runtime.handleAction({ type: 'set-value', key: `vote:${option}`, value: String(count) } as ActionInitialized);
		}
	}
	Hooks.callAll('splash.votes-changed', uuid, getVotes(uuid));
}

export function getVotes(uuid: string): Record<string, { count: number; voters: string[] }> {
	const tallies: Record<string, { count: number; voters: string[] }> = {};
	for (const [userId, optionId] of voteLedgers.get(uuid) ?? []) {
		tallies[optionId] ??= { count: 0, voters: [] };
		tallies[optionId].count += 1;
		tallies[optionId].voters.push(game.users?.get(userId)?.name ?? userId);
	}
	return tallies;
}

export function getAllVotes(): Record<string, Record<string, { count: number; voters: string[] }>> {
	const board: Record<string, Record<string, { count: number; voters: string[] }>> = {};
	for (const uuid of voteLedgers.keys()) {
		board[uuid] = getVotes(uuid);
	}
	return board;
}

/** GM: wipe a splash's votes and zero visible tallies. */
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
	interceptAction: (action: ActionInitialized, sourceId?: string) => boolean;
	onChanged: (snapshot: RuntimeSnapshot) => void;
	/** Call after runtime.initialize(): adopts shared state and goes live. */
	connect: () => Promise<void>;
	dispose: () => void;
}

export function getPageSnapshot(page: JournalEntryPage): RuntimeSnapshot | undefined {
	return page.getFlag(ID, FLAG_RUNTIME) as RuntimeSnapshot | undefined;
}

/** Keep only snapshot parts the splash still backs (existing states and existing sprites' overrides). Validates proxied snapshots and repairs the stored flag. */
function pruneSnapshot(splash: SplashInitialized, snapshot: RuntimeSnapshot): RuntimeSnapshot {
	const stateKeys = new Set(Object.keys(splash.states ?? {}));
	const spriteIds = new Set((splash.children ?? []).map(c => c?.id).filter(Boolean) as string[]);
	const overrides: RuntimeSnapshot['overrides'] = {};
	for (const [id, ov] of Object.entries(snapshot.overrides ?? {})) {
		if (spriteIds.has(id)) overrides[id] = ov;
	}
	return {
		loadedStates: (snapshot.loadedStates ?? []).filter(s => stateKeys.has(s)),
		values: { ...(snapshot.values ?? {}) },
		overrides,
	};
}

// Debounced page-flag writes (GM-only); rapid edits coalesce into one document update.
const flagTimers = new Map<string, ReturnType<typeof setTimeout>>();
const flagPending = new Map<string, RuntimeSnapshot>();

/** Persist a snapshot to a page's runtime flag. GM-only and debounced per page. */
function writeRuntimeFlag(uuid: string, snapshot: RuntimeSnapshot): void {
	if (game.users?.activeGM?.id !== game.userId) return;
	flagPending.set(uuid, snapshot);
	clearTimeout(flagTimers.get(uuid));
	flagTimers.set(uuid, setTimeout(async () => {
		const snap = flagPending.get(uuid);
		flagPending.delete(uuid);
		flagTimers.delete(uuid);
		const page = await fromUuid(uuid) as JournalEntryPage | null;
		// `==` replaces the whole flag; setFlag merges, leaving stale override keys behind.
		if (page && snap) await page.update({ [`flags.${ID}.==${FLAG_RUNTIME}`]: snap });
	}, 120));
}

/** True only if the splash's own data declares this action somewhere. */
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
	const isWriter = () => game.users?.activeGM?.id === game.userId;
	let live = false;
	let proxyTimer: ReturnType<typeof setTimeout> | undefined;

	const proxy = (snapshot: RuntimeSnapshot) => {
		clearTimeout(proxyTimer);
		proxyTimer = setTimeout(() => {
			game.socket?.emit(`module.${ID}`, {
				eventType: 'splashStateProxy',
				senderId: game.userId,
				payload: { uuid, snapshot },
			} satisfies StateProxyEvent);
		}, 120);
	};

	return {
		interceptAction: (action, sourceId) => {
			// Votes tally per-user on the GM, so only votes route there; never run locally.
			if (action.type === 'vote') {
				if (isWriter()) {
					recordVote(uuid, game.userId ?? '', action.optionId ?? '', splash, runtime);
				} else {
					game.socket?.emit(`module.${ID}`, {
						eventType: 'splashActionIntent',
						senderId: game.userId,
						payload: { uuid, action, sourceId },
					} satisfies ActionIntentEvent);
				}
				return true;
			}
			// Everything else runs locally; the resulting state syncs via onChanged below.
			return false;
		},
		onChanged: (snapshot) => {
			if (!live) return;
			if (isWriter()) writeRuntimeFlag(uuid, pruneSnapshot(splash, snapshot));
			else proxy(snapshot);
		},
		connect: async () => {
			const page = await fromUuid(uuid) as JournalEntryPage | null;
			const shared = page ? getPageSnapshot(page) : undefined;
			// Adopt only a snapshot with loaded states; an empty one means uninitialized, so the GM seeds and a player keeps its own rather than reconciling to blank.
			if (shared && shared.loadedStates?.length) {
				await runtime.applyShared(shared);
			} else if (isWriter()) {
				writeRuntimeFlag(uuid, runtime.snapshot);
			}
			live = true;
		},
		dispose: () => {
			live = false;
			clearTimeout(proxyTimer);
		},
	};
}

/** Mirror runtime-flag changes into open runtimes and repair the stored snapshot when a splash is restructured. */
export function registerSyncHooks(): void {
	Hooks.on('updateJournalEntryPage', async (page: JournalEntryPage, changed: object) => {
		// Match the parent `flags.splash`, not the `runtime` leaf: the `==` write makes the diff key `flags.splash.==runtime`, which a leaf check misses.
		if (foundry.utils.hasProperty(changed, `flags.${ID}`)) {
			const runtime = openRuntimes.get(page.uuid);
			const snapshot = getPageSnapshot(page);
			if (runtime && snapshot) void runtime.applyShared(snapshot);
		}
		// Structure changed: the stored snapshot may reference deleted states/sprites. Prune it (GM only).
		if (foundry.utils.hasProperty(changed, 'system') && game.users?.activeGM?.id === game.userId) {
			const snapshot = getPageSnapshot(page);
			if (snapshot) {
				const pruned = pruneSnapshot(page.system as SplashInitialized, snapshot);
				if (!foundry.utils.objectsEqual(pruned as object, snapshot as object)) {
					// `==` replaces the flag wholesale so orphaned override keys drop (a merge keeps them).
					await page.update({ [`flags.${ID}.==${FLAG_RUNTIME}`]: pruned });
				}
			}
		}
	});
}

/** Socket listener: the GM tallies forwarded votes and persists proxied state edits. */
export function registerSyncSocket(): void {
	game.socket?.on(`module.${ID}`, async (event: ActionIntentEvent | StateProxyEvent) => {
		if (game.users?.activeGM?.id !== game.userId) return;
		const uuid = event?.payload?.uuid;
		if (!uuid) return;
		const page = await fromUuid(uuid);
		const splash = (page as JournalEntryPage | null)?.system as SplashInitialized | undefined;
		if (!splash) return;

		if (event.eventType === 'splashActionIntent') {
			const action = event.payload.action;
			// Only declared vote intents are honoured; everything else runs on the player's own client.
			if (!action || action.type !== 'vote' || !isDeclaredAction(splash, action)) return;
			const runtime = openRuntimes.get(uuid);
			if (runtime) await recordVote(uuid, event.senderId, action.optionId ?? '', splash, runtime);
			return;
		}

		if (event.eventType === 'splashStateProxy') {
			// Prune to declared states/sprites so a player can only nudge real runtime state.
			if (event.payload.snapshot) writeRuntimeFlag(uuid, pruneSnapshot(splash, event.payload.snapshot));
		}
	});
}
