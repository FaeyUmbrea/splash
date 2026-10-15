import type { ActionInitialized, IncrementValueActionInitialized, SetValueActionInitialized, SplashInitialized } from '../datamodel/SplashModel.ts';
import type { RuntimeSnapshot, SplashRuntime } from '../renderer/SplashRuntime.ts';
import type { RuntimeChanges } from './runtimeChanges.ts';
import { ID, PACKAGE_ID } from './const.js';
import { incrementValue } from './incrementValue.ts';
import { canViewSplash, isSplashPage } from './launch.ts';
import { applyRuntimeChanges, combineRuntimeChanges, hasRuntimeChanges, isRuntimeChanges, runtimeChanges } from './runtimeChanges.ts';

/**
 * Synced-mode wiring. A synced splash's runtime snapshot lives in a page flag synced by Foundry. Only a GM
 * can write it. Built-in value commands and votes run there; other local runtime edits proxy field changes.
 * The GM validates each request before persistence and retains per-user vote attribution.
 */

const FLAG_RUNTIME = 'runtime';

interface ActionIntentEvent {
	eventType: 'splashActionIntent';
	senderId: string;
	payload: { uuid: string; action: ActionInitialized; sourceId?: string };
}

/** Local field edits proxied to the GM, with legacy snapshots accepted from already loaded clients. */
interface StateProxyEvent {
	eventType: 'splashStateProxy';
	senderId: string;
	payload: { uuid: string; changes?: RuntimeChanges; snapshot?: RuntimeSnapshot };
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

/** Collect first-party action slots shared by command validation and vote-option discovery. */
function declaredActions(splash: SplashInitialized): ActionInitialized[] {
	const actions: ActionInitialized[] = [];
	for (const child of splash.children ?? []) {
		if ((child?.type === 'button' || child?.type === 'hotspot') && child.onClick) actions.push(child.onClick);
		if (child?.type === 'drop-zone' && child.onDrop) actions.push(child.onDrop);
	}
	for (const state of Object.values(splash.states ?? {})) {
		for (const action of state?.onEnter ?? []) {
			if (action) actions.push(action);
		}
	}
	return actions;
}

/** Read unique vote options from every declared action slot, including hotspot and drop reactions. */
function declaredVoteOptions(splash: SplashInitialized): string[] {
	return [...new Set(declaredActions(splash).flatMap(action => action.type === 'vote' && action.optionId ? [action.optionId] : []))];
}

/** GM-side: record a vote and surface tallies per visibility. */
function recordVote(uuid: string, userId: string, optionId: string, splash: SplashInitialized, page?: JournalEntryPage): void {
	const ledger = voteLedgers.get(uuid) ?? new Map<string, string>();
	ledger.set(userId, optionId);
	voteLedgers.set(uuid, ledger);
	if (splash.voteVisibility === 'all') {
		for (const option of declaredVoteOptions(splash)) {
			const count = [...ledger.values()].filter(choice => choice === option).length;
			// Tallies ride the value pipeline; {vote:option} interpolation then displays them.
			writeSharedValue(uuid, page, splash, { type: 'set-value', key: `vote:${option}`, value: String(count) } as SetValueActionInitialized);
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
	const page = await fromUuid(uuid);
	const splash = isSplashPage(page) ? page.system as SplashInitialized : undefined;
	if (splash?.voteVisibility === 'all') {
		for (const option of declaredVoteOptions(splash)) {
			writeSharedValue(uuid, page as JournalEntryPage, splash, { type: 'set-value', key: `vote:${option}`, value: '0' } as SetValueActionInitialized);
		}
	}
	Hooks.callAll('splash.votes-changed', uuid, {});
}

export interface SyncDriver {
	interceptAction: (action: ActionInitialized, sourceId?: string) => boolean;
	onChanged: (snapshot: RuntimeSnapshot) => void;
	/** Observe an adopted shared snapshot without treating its fields as new local edits. */
	adopt: (snapshot: RuntimeSnapshot) => void;
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
const flagWrites = new Map<string, Promise<void>>();

/** Read queued changes before the saved flag so an incoming request cannot overwrite an unacknowledged write. */
function currentSnapshot(uuid: string, page: JournalEntryPage | undefined, splash: SplashInitialized): RuntimeSnapshot {
	const current = flagPending.get(uuid) ?? (page ? getPageSnapshot(page) : undefined);
	return current ?? { loadedStates: splash.initialState?.filter((state): state is string => typeof state === 'string') ?? [], values: { ...splash.values }, overrides: {} };
}

/** Apply each value command in acceptance order; clients adopt the result through the runtime-flag hook. */
function writeSharedValue(uuid: string, page: JournalEntryPage | undefined, splash: SplashInitialized, action: IncrementValueActionInitialized | SetValueActionInitialized): void {
	const snapshot = currentSnapshot(uuid, page, splash);
	const key = action.key ?? '';
	writeRuntimeFlag(uuid, pruneSnapshot(splash, {
		...snapshot,
		values: { ...snapshot.values, [key]: action.type === 'increment-value' ? incrementValue(snapshot.values[key], action) : action.value ?? '' },
	}));
}

/** Persist a snapshot to a page's runtime flag. GM-only and debounced per page. */
function writeRuntimeFlag(uuid: string, snapshot: RuntimeSnapshot): void {
	if (game.users?.activeGM?.id !== game.userId) return;
	flagPending.set(uuid, snapshot);
	clearTimeout(flagTimers.get(uuid));
	flagTimers.set(uuid, setTimeout(() => {
		const snap = flagPending.get(uuid);
		flagTimers.delete(uuid);
		if (!snap) return;
		const previous = flagWrites.get(uuid) ?? Promise.resolve();
		const write = previous.then(async () => {
			const page = await fromUuid(uuid);
			// Keep document writes ordered, and recheck authored IDs if the page changed while waiting.
			if (isSplashPage(page)) {
				const changes: Record<string, unknown> = { [`flags.${ID}.==${FLAG_RUNTIME}`]: pruneSnapshot(page.system as SplashInitialized, snap) };
				await page.update(changes);
			}
			if (flagPending.get(uuid) === snap) flagPending.delete(uuid);
		}).catch((error) => {
			console.error('Splash | shared state could not be saved', error);
		});
		flagWrites.set(uuid, write);
		void write.then(() => {
			if (flagWrites.get(uuid) === write) flagWrites.delete(uuid);
		});
	}, 120));
}

/** True only if the splash's own data declares this action somewhere. */
export function isDeclaredAction(splash: SplashInitialized, action: ActionInitialized): boolean {
	const equal = foundry.utils.equals ?? foundry.utils.objectsEqual;
	return declaredActions(splash).some(candidate => equal(candidate as object, action as object));
}

export function createSyncDriver(uuid: string, splash: SplashInitialized, runtime: SplashRuntime): SyncDriver {
	const isWriter = () => game.users?.activeGM?.id === game.userId;
	let live = false;
	let disposed = false;
	let proxyTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingChanges: RuntimeChanges | undefined;
	let observed = runtime.snapshot;
	let page: JournalEntryPage | undefined;

	const proxy = (changes: RuntimeChanges) => {
		pendingChanges = combineRuntimeChanges(pendingChanges, changes);
		clearTimeout(proxyTimer);
		proxyTimer = setTimeout(() => {
			const changes = pendingChanges;
			pendingChanges = undefined;
			if (!changes) return;
			game.socket?.emit(`module.${PACKAGE_ID}`, {
				eventType: 'splashStateProxy',
				senderId: game.userId,
				payload: { uuid, changes },
			} satisfies StateProxyEvent);
		}, 120);
	};

	return {
		interceptAction: (action, sourceId) => {
			if (live && (action.type === 'increment-value' || action.type === 'set-value')) {
				if (isWriter()) {
					writeSharedValue(uuid, page, splash, action);
				} else {
					game.socket?.emit(`module.${PACKAGE_ID}`, {
						eventType: 'splashActionIntent',
						senderId: game.userId,
						payload: { uuid, action, sourceId },
					} satisfies ActionIntentEvent);
				}
				return true;
			}
			// Votes keep per-user attribution on the GM and never run locally.
			if (action.type === 'vote') {
				if (isWriter()) {
					recordVote(uuid, game.userId ?? '', action.optionId ?? '', splash, page);
				} else {
					game.socket?.emit(`module.${PACKAGE_ID}`, {
						eventType: 'splashActionIntent',
						senderId: game.userId,
						payload: { uuid, action, sourceId },
					} satisfies ActionIntentEvent);
				}
				return true;
			}
			// Other actions run locally; the resulting field edits sync via onChanged below.
			return false;
		},
		onChanged: (snapshot) => {
			const before = observed;
			observed = snapshot;
			if (!live) return;
			const changes = runtimeChanges(before, snapshot);
			if (!hasRuntimeChanges(changes)) return;
			if (isWriter()) writeRuntimeFlag(uuid, pruneSnapshot(splash, applyRuntimeChanges(currentSnapshot(uuid, page, splash), changes)));
			else proxy(changes);
		},
		adopt: (snapshot) => { observed = snapshot; },
		connect: async () => {
			const document = await fromUuid(uuid);
			if (disposed) return;
			page = document instanceof JournalEntryPage ? document : undefined;
			const shared = page ? getPageSnapshot(page) : undefined;
			// Adopt only a snapshot with loaded states; an empty one means uninitialized, so the GM seeds and a player keeps its own rather than reconciling to blank.
			if (shared && shared.loadedStates?.length) {
				await runtime.applyShared(shared);
			} else if (isWriter()) {
				writeRuntimeFlag(uuid, runtime.snapshot);
			}
			observed = runtime.snapshot;
			if (!disposed) live = true;
		},
		dispose: () => {
			disposed = true;
			live = false;
			clearTimeout(proxyTimer);
			pendingChanges = undefined;
		},
	};
}

/** Mirror runtime-flag changes into open runtimes and repair the stored snapshot when a splash is restructured. */
export function registerSyncHooks(): void {
	Hooks.on('updateJournalEntryPage', async (page: JournalEntryPage, changed: object) => {
		// Match the parent `flags.splash`, not the `runtime` leaf: the `==` write makes the diff key `flags.splash.==runtime`, which a leaf check misses.
		if (!page.uuid) return;
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
					const changes: Record<string, unknown> = { [`flags.${ID}.==${FLAG_RUNTIME}`]: pruned };
					await page.update(changes);
				}
			}
		}
	});
}

/** Accept plain snapshot containers rather than arrays, nulls or class instances. */
function isSnapshotRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/** Validate the transport shape before pruning states and overrides to authored IDs. */
export function isRuntimeSnapshot(value: unknown): value is RuntimeSnapshot {
	if (!isSnapshotRecord(value)) return false;
	return Array.isArray(value.loadedStates)
		&& value.loadedStates.every(state => typeof state === 'string')
		&& isSnapshotRecord(value.values)
		&& isSnapshotRecord(value.overrides)
		&& Object.values(value.overrides).every(isSnapshotRecord);
}

/** Socket listener: the GM accepts declared value commands, tallies votes and persists proxied field edits. */
export function registerSyncSocket(): void {
	game.socket?.on(`module.${PACKAGE_ID}`, async (event: ActionIntentEvent | StateProxyEvent, senderId: string) => {
		if (game.users?.activeGM?.id !== game.userId) return;
		if (event?.eventType !== 'splashActionIntent' && event?.eventType !== 'splashStateProxy') return;
		const uuid = event.payload?.uuid;
		if (typeof uuid !== 'string' || !uuid || typeof senderId !== 'string') return;
		const sender = game.users?.get(senderId);
		if (!sender) return;
		const page = await fromUuid(uuid);
		if (!isSplashPage(page) || !canViewSplash(page, sender)) return;
		const splash = page.system as SplashInitialized;
		if (splash.mode !== 'synced') return;

		if (event.eventType === 'splashActionIntent') {
			const action = event.payload.action;
			if (!action || !['vote', 'increment-value', 'set-value'].includes(action.type)) return;
			// Text inputs author their value at runtime; other command payloads must match a declared action.
			const input = action.type === 'set-value' && typeof action.key === 'string' && typeof action.value === 'string'
				&& splash.children?.some(child => child.type === 'text-input' && child.valueKey === action.key);
			if (!input && !isDeclaredAction(splash, action)) return;
			if (action.type === 'increment-value' || action.type === 'set-value') {
				writeSharedValue(uuid, page, splash, action);
				return;
			}
			if (action.type !== 'vote') return;
			recordVote(uuid, senderId, action.optionId ?? '', splash, page);
			return;
		}

		if (event.eventType === 'splashStateProxy') {
			// Prune to declared states/sprites so a player can only nudge real runtime state.
			if (event.payload.changes !== undefined) {
				if (!isRuntimeChanges(event.payload.changes)) return;
				const snapshot = applyRuntimeChanges(currentSnapshot(uuid, page, splash), event.payload.changes);
				writeRuntimeFlag(uuid, pruneSnapshot(splash, snapshot));
			} else if (isRuntimeSnapshot(event.payload.snapshot)) {
				// Keep accepting snapshots from clients which loaded the previous module before its update.
				writeRuntimeFlag(uuid, pruneSnapshot(splash, event.payload.snapshot));
			}
		}
	});
}
