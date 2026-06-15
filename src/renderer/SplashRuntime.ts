import type {
	ActionInitialized,
	SplashInitialized,
	SpriteInitialized,
	StateInitialized,
} from '../datamodel/SplashModel.ts';
import type { RenderedSprite, SplashRenderer, SplashValues, SpriteOverrides } from './SplashRenderer.ts';
import type { SpriteNode, SpriteTree } from './spriteTree.ts';
import { getChildrenWithState } from '../utils/helpers.ts';
import { interpolate } from '../utils/interpolate.ts';
import { buildSpriteTree } from './spriteTree.ts';

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;

/** Notification of state lifecycle events; the Foundry layer maps these onto Hooks. */
export type SplashEventSink = (event: string, ...args: unknown[]) => void;

/** Serializable snapshot of the interactive runtime state. */
export interface RuntimeSnapshot {
	loadedStates: string[];
	values: SplashValues;
	/** Ephemeral per-sprite property overrides set by inline macros (e.g. a dialed letter). */
	overrides: Record<string, SpriteOverrides>;
}

export interface SplashRuntimeOptions {
	/** Executes action types the runtime does not handle itself (e.g. macros). */
	externalAction?: (action: ActionInitialized) => Promise<void> | void;
	/**
	 * Pre-empts action handling; returning true consumes the action. Synced
	 * players use this to forward intents to the GM instead of acting locally.
	 */
	interceptAction?: (action: ActionInitialized, sourceId?: string) => Promise<boolean> | boolean;
	/** Notified after loaded states or values change (used to persist shared state). */
	onChanged?: (snapshot: RuntimeSnapshot) => void;
	/** What launched this splash (e.g. `{ door }`), exposed to inline macros as `api.trigger`. */
	trigger?: Record<string, unknown>;
}

/**
 * Renderer-agnostic splash orchestration: which sprites exist, which states are
 * loaded, how sprites move between states, and the named values that drive
 * interactivity. All drawing is delegated to the injected SplashRenderer.
 */
export class SplashRuntime {
	#splash: SplashInitialized;
	#renderer: SplashRenderer;
	#events: SplashEventSink;
	#externalAction: (action: ActionInitialized) => Promise<void> | void;
	#interceptAction: (action: ActionInitialized, sourceId?: string) => Promise<boolean> | boolean;
	#onChanged: (snapshot: RuntimeSnapshot) => void;

	#rendered: Map<string, RenderedSprite> = new Map();
	#loadedStates: string[] = [];
	#changingBlocked = false;
	#suppressAnimIn = false;
	#mirroring = false;
	// Set during play-out/teardown so `#emitChanged` stays silent: unloading every state on close is local
	// cleanup, and broadcasting it would persist `loadedStates: []` and blank the splash on the next synced open.
	#tearingDown = false;
	#values: SplashValues = {};
	#overrides: Record<string, SpriteOverrides> = {};
	#trigger: Record<string, unknown>;
	// The materialized tree for the current loaded-state composition. Built lazily, invalidated on load/unload.
	#treeCache: SpriteTree | null = null;

	constructor(
		splash: SplashInitialized,
		renderer: SplashRenderer,
		events: SplashEventSink = () => {},
		{ externalAction = () => {}, interceptAction = () => false, onChanged = () => {}, trigger = {} }: SplashRuntimeOptions = {},
	) {
		this.#splash = splash;
		this.#renderer = renderer;
		this.#events = events;
		this.#externalAction = externalAction;
		this.#interceptAction = interceptAction;
		this.#onChanged = onChanged;
		this.#trigger = trigger;
		this.#values = { ...(splash.values ?? {}) };
	}

	get values(): SplashValues {
		return { ...this.#values };
	}

	get snapshot(): RuntimeSnapshot {
		const overrides: Record<string, SpriteOverrides> = {};
		for (const [id, o] of Object.entries(this.#overrides)) overrides[id] = { ...o };
		return { loadedStates: [...this.#loadedStates], values: { ...this.#values }, overrides };
	}

	/** Broadcast the current snapshot, unless we're mirroring a remote one or tearing the splash down. */
	#emitChanged(): void {
		if (!this.#mirroring && !this.#tearingDown) this.#onChanged(this.snapshot);
	}

	/**
	 * Set an ephemeral property override on a sprite (e.g. a dialed letter's `text`): applied over stored
	 * data, synced to the table, never persisted. `value` null/undefined clears the one property.
	 */
	setOverride(spriteId: string, property: string, value: unknown): void {
		const current = this.#overrides[spriteId] ?? {};
		// null and undefined both mean "clear" (the renderers already treat null as no-override).
		if (value === undefined || value === null) delete current[property];
		else current[property] = value;
		// Drop empty bags so a cleared override leaves no trace in the synced snapshot.
		if (Object.keys(current).length === 0) delete this.#overrides[spriteId];
		else this.#overrides[spriteId] = current;
		this.#rendered.get(spriteId)?.applyOverrides({ ...(this.#overrides[spriteId] ?? {}) });
		this.#emitChanged();
	}

	/**
	 * Mirror an authoritative shared snapshot: load/unload to match its states and
	 * adopt its values. onEnter actions are suppressed — only the executing
	 * (GM) client may cause side effects like macros.
	 */
	async applyShared(snapshot: RuntimeSnapshot): Promise<void> {
		this.#mirroring = true;
		try {
			for (const [key, value] of Object.entries(snapshot.values)) {
				if (this.#values[key] !== value) this.#setValue(key, value);
			}
			for (const stateId of snapshot.loadedStates) {
				if (!this.#loadedStates.includes(stateId)) await this.loadState(stateId);
			}
			for (const stateId of [...this.#loadedStates]) {
				if (!snapshot.loadedStates.includes(stateId)) await this.unloadState(stateId);
			}
			// Reconcile overrides to the snapshot exactly — adopt present, clear absent — so a cleared dial on
			// the executor reverts on followers. Runs after states load so the target sprites exist.
			const incomingAll = (snapshot.overrides ?? {}) as Record<string, Record<string, unknown>>;
			for (const spriteId of Object.keys({ ...this.#overrides, ...incomingAll })) {
				const incoming = incomingAll[spriteId] ?? {};
				const local = this.#overrides[spriteId] ?? {};
				for (const property of Object.keys({ ...local, ...incoming })) {
					const value = property in incoming ? incoming[property] : undefined;
					if (local[property] !== value) this.setOverride(spriteId, property, value);
				}
			}
		} finally {
			this.#mirroring = false;
		}
	}

	/**
	 * Preload assets and bring up the splash's initial states.
	 * skipAnimations suppresses entrance animations: restoring clients must show
	 * the splash instantly so nothing behind it is ever glimpsed.
	 */
	async initialize({ skipAnimations = false }: { skipAnimations?: boolean } = {}): Promise<void> {
		this.#suppressAnimIn = skipAnimations;
		try {
			await this.#renderer.preload(this.#splash.children);
			for (const state of this.#splash.initialState) {
				if (state) await this.loadState(state);
			}
		} finally {
			this.#suppressAnimIn = false;
		}
	}

	/**
	 * Apply a sprite-triggered action. Value and state actions are handled
	 * in-instance (so multiple open splashes never cross-talk); everything else
	 * is delegated to the external executor.
	 */
	async handleAction(action: ActionInitialized, sourceId?: string): Promise<void> {
		if (await this.#interceptAction(action, sourceId)) return;
		switch (action.type) {
			case 'script':
				await this.#runScript((action as { source?: string }).source ?? '', sourceId);
				break;
			case 'set-value':
				this.#setValue(action.key ?? '', action.value ?? '');
				break;
			case 'increment-value': {
				const current = Number(this.#values[action.key ?? ''] ?? 0);
				let next = current + (action.step ?? 1);
				const { min, max, wrap } = action;
				if (wrap && min !== null && max !== null && min !== undefined && max !== undefined) {
					if (next > max) next = min;
					if (next < min) next = max;
				} else {
					if (max !== null && max !== undefined) next = Math.min(next, max);
					if (min !== null && min !== undefined) next = Math.max(next, min);
				}
				this.#setValue(action.key ?? '', next);
				break;
			}
			case 'change-state':
				if (!this.#conditionsMet(action.conditions)) return;
				await this.changeStates({ load: action.load as string[], unload: action.unload as string[] });
				break;
			case 'close':
				this.#events('splash.close-requested');
				break;
			default:
				await this.#externalAction(action);
		}
	}

	// --- inline-macro execution (materialized tree + scope) ------------------

	/** The materialized tree for the rendered sprites, with live accessors bound. Built once per state load. */
	#tree(): SpriteTree {
		if (this.#treeCache) return this.#treeCache;
		const inState = (this.#splash.children ?? []).filter(c => c?.id && this.#rendered.has(c.id)) as SpriteInitialized[];
		const tree = buildSpriteTree(inState);
		const walk = (node: SpriteNode) => {
			this.#bindNode(node);
			node.children.forEach(walk);
		};
		walk(tree.root);
		this.#treeCache = tree;
		return tree;
	}

	/** Bind live override-backed accessors onto a node so macros can read/write `node.text`. */
	#bindNode(node: SpriteNode): void {
		node.get = property => this.#readProperty(node, property);
		node.set = (property, value) => {
			if (node.id) this.setOverride(node.id, property, value);
		};
		Object.defineProperty(node, 'text', {
			configurable: true,
			get: () => this.#readProperty(node, 'text'),
			set: (value) => {
				if (node.id) this.setOverride(node.id, 'text', value);
			},
		});
	}

	/** Read a property override-then-data; `text` falls back to the interpolated stored text. */
	#readProperty(node: SpriteNode, property: string): unknown {
		const override = node.id ? this.#overrides[node.id]?.[property] : undefined;
		if (override !== undefined) return override;
		const sprite = node.sprite as Record<string, unknown> | null;
		if (property === 'text') return interpolate((sprite?.text as string) ?? '', this.#values);
		return sprite?.[property];
	}

	/** Run an inline-macro source with `scope` = the firing sprite's node and `context` = its data bag. */
	async #runScript(source: string, sourceId?: string): Promise<void> {
		if (!source.trim()) return;
		const tree = this.#tree();
		const scope = (sourceId ? tree.byId.get(sourceId) : undefined) ?? tree.root;
		// Runtime hooks a macro needs beyond the tree: change this splash's state, set a value, close it,
		// read what triggered it, or ask a door to open (routed via the GM when the player can't write walls).
		const api = {
			trigger: this.#trigger,
			changeState: (load?: string[], unload?: string[]) => this.changeStates({ load, unload }),
			setValue: (key: string, value: unknown) => this.#setValue(key, value),
			close: () => this.#events('splash.close-requested'),
			unlockDoor: (uuid?: string) => this.#events('splash.unlock-door', uuid ?? this.#trigger.door),
		};
		try {
			const fn = new AsyncFunction('scope', 'context', 'api', source);
			await fn(scope, scope.context, api);
		} catch (error) {
			console.error('Splash | inline script failed', error);
		}
	}

	#setValue(key: string, value: unknown): void {
		this.#values[key] = value;
		for (const rendered of this.#rendered.values()) {
			rendered.updateValues(this.#values);
		}
		this.#emitChanged();
	}

	#conditionsMet(conditions: Record<string, string> | null | undefined): boolean {
		if (!conditions) return true;
		return Object.entries(conditions).every(([key, expected]) => String(this.#values[key] ?? '') === expected);
	}

	async #executeOnEnter(stateId: string): Promise<void> {
		if (this.#mirroring) return;
		for (const action of this.#splash.states?.[stateId]?.onEnter ?? []) {
			if (action) await this.handleAction(action);
		}
	}

	/** Pick the highest-priority state a sprite has among the given state ids. */
	#determineState(child: SpriteInitialized, stateIds: string[]): StateInitialized | undefined {
		let nextState;
		for (const stateId of stateIds) {
			const state = child.states[stateId];
			if (state) {
				if (!nextState) {
					nextState = state;
				}
				if (nextState?.priority < (state.priority ?? 0)) {
					nextState = state;
				}
			}
		}
		return nextState;
	}

	async #loadChild(child: SpriteInitialized, state: StateInitialized): Promise<number> {
		if (!state) return 0;
		const animation = this.#suppressAnimIn ? null : (state.animIn ?? child.animIn ?? this.#splash.animIn);
		const sprite = await this.#renderer.addSprite(child, state, animation, {
			// child.id is closed over so a script action knows which sprite fired it (its `scope`).
			onAction: action => this.handleAction(action, child.id),
		});
		if (!sprite) return 0;
		sprite.updateValues(this.#values);
		// A sprite added while an override already exists (e.g. a restoring/synced client) adopts it.
		if (this.#overrides[child.id]) sprite.applyOverrides({ ...this.#overrides[child.id] });
		this.#rendered.set(child.id, sprite);
		this.#treeCache = null; // the rendered set changed
		return this.#renderer.animationDuration(animation);
	}

	/** Load a state: instantiate its sprites or transition already-rendered ones. */
	async loadState(stateId: string): Promise<number | undefined> {
		if (this.#loadedStates.includes(stateId)) return;
		const children = getChildrenWithState(this.#splash, stateId);
		let longestTimeout = 0;
		for (const child of children) {
			const state = this.#determineState(child, [stateId, ...this.#loadedStates]);
			if (!state) continue;
			const rendered = this.#rendered.get(child.id);
			if (!rendered) {
				longestTimeout = Math.max(longestTimeout, await this.#loadChild(child, state));
			} else {
				rendered.transition(state);
			}
		}
		this.#loadedStates.push(stateId);
		this.#emitChanged();
		await this.#executeOnEnter(stateId);
		return longestTimeout;
	}

	/** Unload a state: transition its sprites to a remaining state or animate them out. */
	async unloadState(stateId: string): Promise<number | undefined> {
		if (!this.#loadedStates.includes(stateId)) return;
		let longestTimeout = 0;
		const children = getChildrenWithState(this.#splash, stateId);
		for (const child of children) {
			const rendered = this.#rendered.get(child.id);
			if (!rendered) continue;
			const remainingStates = this.#loadedStates.filter(c => c !== stateId);
			if (remainingStates.some(c => Object.keys(child.states).includes(c))) {
				const state = this.#determineState(child, remainingStates);
				if (!state) continue;
				rendered.transition(state);
			} else {
				const state = child.states[stateId]!;
				const animation = child.animOut ?? state.animOut ?? this.#splash.animOut;
				if (animation && this.#renderer.animationDuration(animation) > 0) {
					const timeout = this.#renderer.animationDuration(animation);
					// Best-effort: a failed out-animation must still destroy this sprite and not abort the others.
					try {
						await this.#renderer.animate(animation, rendered);
					} catch (error) {
						console.error('Splash | out-animation failed', error);
					}
					setTimeout(() => {
						rendered.destroy();
						this.#rendered.delete(child.id);
						delete this.#overrides[child.id]; // a re-instantiated sprite resets, not resurrects
						this.#treeCache = null;
					}, timeout);
					longestTimeout = Math.max(longestTimeout, timeout);
				} else {
					rendered.destroy();
					this.#rendered.delete(child.id);
					delete this.#overrides[child.id];
					this.#treeCache = null;
				}
			}
		}
		this.#loadedStates = this.#loadedStates.filter(state => state !== stateId);
		this.#emitChanged();
		return longestTimeout;
	}

	/** Apply a change-states action; re-entrant calls are ignored while a change is running. */
	async changeStates({ load, unload }: { load?: string[]; unload?: string[] }): Promise<void> {
		if (this.#changingBlocked) return;
		this.#changingBlocked = true;
		let longestTimeout = 0;
		if (load) {
			for (const name of load) {
				this.#events('splash.loading-state', name);
				longestTimeout = Math.max(longestTimeout, (await this.loadState(name)) ?? 0);
				this.#events('splash.loaded-state', name);
			}
		}
		if (unload) {
			for (const name of unload) {
				this.#events('splash.unloading-state', name);
				longestTimeout = Math.max(longestTimeout, (await this.unloadState(name)) ?? 0);
				this.#events('splash.unloaded-state', name);
			}
		}
		if (longestTimeout > 0) {
			setTimeout(() => {
				this.#changingBlocked = false;
				this.#events('splash.changed-states', { load, unload });
			}, longestTimeout);
		} else {
			this.#changingBlocked = false;
			this.#events('splash.changed-states', { load, unload });
		}
	}

	/**
	 * Unload every state so each sprite runs its out-animation, resolving once the longest finishes. The
	 * caller awaits this before `destroy()` so the outro is seen. Resolves immediately if nothing animates.
	 */
	async playOut(): Promise<void> {
		this.#tearingDown = true;
		if (!this.#hasOutro()) return;
		let longest = 0;
		for (const stateId of [...this.#loadedStates]) {
			longest = Math.max(longest, (await this.unloadState(stateId)) ?? 0);
		}
		if (longest > 0) await new Promise(resolve => setTimeout(resolve, longest));
	}

	/** Whether any currently-rendered sprite has an out-animation with a non-zero duration. */
	#hasOutro(): boolean {
		for (const stateId of this.#loadedStates) {
			for (const child of getChildrenWithState(this.#splash, stateId)) {
				if (!this.#rendered.has(child.id)) continue;
				const animation = child.animOut ?? child.states[stateId]?.animOut ?? this.#splash.animOut;
				if (animation && this.#renderer.animationDuration(animation) > 0) return true;
			}
		}
		return false;
	}

	destroy(): void {
		this.#tearingDown = true;
		this.#rendered.clear();
		this.#renderer.destroy();
	}
}
