import type {
	SplashInitialized,
	SpriteInitialized,
	StateInitialized,
} from '../datamodel/SplashModel.ts';
import type { RenderedSprite, SplashRenderer } from './SplashRenderer.ts';
import { getChildrenWithState } from '../utils/helpers.ts';

/** Notification of state lifecycle events; the Foundry layer maps these onto Hooks. */
export type SplashEventSink = (event: string, ...args: unknown[]) => void;

/**
 * Renderer-agnostic splash orchestration: which sprites exist, which states are
 * loaded, and how sprites move between states. All drawing is delegated to the
 * injected SplashRenderer.
 */
export class SplashRuntime {
	#splash: SplashInitialized;
	#renderer: SplashRenderer;
	#events: SplashEventSink;

	#rendered: Map<string, RenderedSprite> = new Map();
	#loadedStates: string[] = [];
	#changingBlocked = false;
	#suppressAnimIn = false;

	constructor(splash: SplashInitialized, renderer: SplashRenderer, events: SplashEventSink = () => {}) {
		this.#splash = splash;
		this.#renderer = renderer;
		this.#events = events;
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
		const sprite = await this.#renderer.addSprite(child, state, animation);
		if (!sprite) return 0;
		this.#rendered.set(child.id, sprite);
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
					await this.#renderer.animate(animation, rendered);
					const timeout = this.#renderer.animationDuration(animation);
					setTimeout(() => {
						rendered.destroy();
						this.#rendered.delete(child.id);
					}, timeout);
					longestTimeout = Math.max(longestTimeout, timeout);
				} else {
					rendered.destroy();
					this.#rendered.delete(child.id);
				}
			}
		}
		this.#loadedStates = this.#loadedStates.filter(state => state !== stateId);
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

	destroy(): void {
		this.#rendered.clear();
		this.#renderer.destroy();
	}
}
