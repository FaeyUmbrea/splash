import type { SplashInitialized } from '../datamodel/SplashModel.ts';
import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
import type { SplashRenderer } from '../renderer/SplashRenderer.ts';
import type { RuntimeSnapshot, SplashEventSink } from '../renderer/SplashRuntime.ts';
import type { PresenceReporter } from '../utils/presence.ts';
import type { SyncDriver } from '../utils/sync.ts';
import { SplashAPI } from '../api/api.ts';
import { SplashRuntime } from '../renderer/SplashRuntime.ts';
import { consumePendingTrigger } from '../triggers/context.ts';
import { OVERLAY_ID } from '../utils/const.ts';
import { createPresenceReporter } from '../utils/presence.ts';
import { getActiveSplash } from '../utils/settings.ts';
import { createSyncDriver, registerRuntime, unregisterRuntime } from '../utils/sync.ts';

/** Foundry services attached to one playback instance, including an optional preview observer. */
export interface PlaybackOptions {
	app: SvelteApplication;
	pageUuid?: string | null;
	spectate?: boolean;
	skipAnimations?: boolean;
	onSnapshot?: (snapshot: RuntimeSnapshot) => void;
	onClose?: (skipOutro: boolean) => void;
}

/** Own the runtime's Foundry hooks, shared-state connection and presence until this playback is disposed. */
export class SplashPlayback {
	readonly runtime: SplashRuntime;
	readonly #options: PlaybackOptions;
	#sync?: SyncDriver;
	#presence?: PresenceReporter;
	#hooks: ['splash.close-splash' | 'splash.change-states', number][] = [];
	#disposed = false;
	/** Play this instance's outro through Foundry's close lifecycle. */
	#preClose = () => this.runtime.playOut();

	constructor(config: SplashInitialized, renderer: SplashRenderer, options: PlaybackOptions) {
		this.#options = options;
		this.runtime = new SplashRuntime(config, renderer, (event, ...args) => {
			if (this.#disposed) return;
			if (event === 'splash.close-requested') {
				this.#requestClose();
			} else {
				const emitHook: SplashEventSink = Hooks.call.bind(Hooks);
				emitHook(event, ...args);
			}
		}, {
			trigger: { ...consumePendingTrigger() },
			externalAction: action => SplashAPI.getInstance().processAction(action),
			interceptAction: (action, sourceId) => this.#disposed || !!options.spectate || (this.#sync?.interceptAction(action, sourceId) ?? false),
			onChanged: (snapshot) => {
				if (this.#disposed) return;
				this.#sync?.onChanged(snapshot);
				this.#presence?.onChanged(snapshot);
				options.onSnapshot?.(snapshot);
			},
			onShared: (snapshot) => {
				if (this.#disposed) return;
				this.#sync?.adopt(snapshot);
				this.#presence?.onChanged(snapshot);
				options.onSnapshot?.(snapshot);
			},
		});
		if (options.pageUuid) {
			registerRuntime(options.pageUuid, this.runtime);
			if (config.mode === 'synced' && !options.spectate) this.#sync = createSyncDriver(options.pageUuid, config, this.runtime);
			if (!options.spectate) this.#presence = createPresenceReporter(options.pageUuid);
		}
		this.#hooks.push(['splash.close-splash', Hooks.on('splash.close-splash', (opts?: { skipOutro?: boolean }) => this.#close(!!opts?.skipOutro))]);
		this.#hooks.push(['splash.change-states', Hooks.on('splash.change-states', (change: { load?: string[]; unload?: string[] }) => {
			if (!this.#disposed) void this.runtime.changeStates(change);
		})]);
	}

	/** Initialise drawing and shared state, returning false when this instance closed while loading. */
	async start(): Promise<boolean> {
		try {
			await this.runtime.initialize({ skipAnimations: this.#options.skipAnimations });
			if (this.#disposed) return false;
			await this.#sync?.connect();
			if (this.#disposed) {
				this.#sync?.dispose();
				return false;
			}
			this.#options.app.onPreClose = this.#preClose;
			this.#options.onSnapshot?.(this.runtime.snapshot);
			return true;
		} catch (error) {
			const wasDisposed = this.#disposed;
			this.dispose();
			if (wasDisposed) return false;
			throw error;
		}
	}

	/** End the GM's current global launch; other authored Close actions affect only their own playback. */
	#requestClose(): void {
		const { app, pageUuid, onClose, spectate } = this.#options;
		if (!onClose && !spectate && app.id === OVERLAY_ID && game.user?.isGM && pageUuid && getActiveSplash()?.uuid === pageUuid) {
			void SplashAPI.getInstance().close({ global: true });
		} else {
			this.#close(false);
		}
	}

	/** Route a close request to the preview controls or this instance's Foundry application. */
	#close(skipOutro: boolean): void {
		if (this.#disposed) return;
		if (this.#options.onClose) this.#options.onClose(skipOutro);
		else void this.#options.app.close({ skipOutro });
	}

	/** Remove this instance's hooks and services, preserving another instance's close handler. */
	dispose(): void {
		if (this.#disposed) return;
		this.#disposed = true;
		for (const [hook, id] of this.#hooks) Hooks.off(hook, id);
		this.#hooks = [];
		this.#presence?.dispose();
		this.#sync?.dispose();
		if (this.#options.pageUuid) unregisterRuntime(this.#options.pageUuid, this.runtime);
		if (this.#options.app.onPreClose === this.#preClose) this.#options.app.onPreClose = undefined;
		this.runtime.destroy();
	}
}
