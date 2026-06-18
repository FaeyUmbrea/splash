<script lang='ts'>
	import type { SplashInitialized } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import type { PresenceReporter } from '../utils/presence.ts';
	import type { SyncDriver } from '../utils/sync.ts';
	import { onDestroy, onMount } from 'svelte';
	import { SplashAPI } from '../api/api.ts';
	import { HtmlRenderer } from '../renderer/HtmlRenderer.svelte.ts';
	import { PixiRenderer } from '../renderer/PixiRenderer.ts';
	import { selectRenderer } from '../renderer/selectRenderer.ts';
	import { SplashRuntime } from '../renderer/SplashRuntime.ts';
	import { consumePendingTrigger } from '../triggers/context.ts';
	import { createPresenceReporter } from '../utils/presence.ts';
	import { createSyncDriver, registerRuntime, unregisterRuntime } from '../utils/sync.ts';

	export let foundryApp: SvelteApplication;

	export let splashConfig: SplashInitialized;

	/** Source page uuid; synced mode needs it to key shared state (null = preview). */
	export let pageUuid: string | null = null;

	/** Restored splashes appear instantly so nothing behind them is glimpsed. */
	export let skipAnimations: boolean = false;

	/** Passive mirror of another client's local splash (the OBS stream view). No presence, no sync, no local input. */
	export let spectate: boolean = false;

	const rendererKind = selectRenderer();

	let view: HTMLCanvasElement;
	let htmlStage: HTMLDivElement;
	let loading = true;
	let runtime: SplashRuntime | undefined;
	let sync: SyncDriver | undefined;
	let presence: PresenceReporter | undefined;

	// close-requested stays instance-scoped (this window only); everything else becomes a global hook.
	function emitEvent(event: string, ...args: unknown[]) {
		if (event === 'splash.close-requested') {
			foundryApp.close();
			return;
		}
		Hooks.call(event, ...args);
	}

	onMount(async () => {
		const renderer = rendererKind === 'webgl' ? new PixiRenderer(view) : new HtmlRenderer(htmlStage);
		const synced = splashConfig.mode === 'synced' && !!pageUuid && !spectate;
		// Any non-spectator client (players and DMs) reports presence so a spectator can follow it: local
		// carries private state, synced just signals open/close (its shared state rides the sync flag).
		const reportsPresence = !!pageUuid && !spectate;
		runtime = new SplashRuntime(splashConfig, renderer, emitEvent, {
			trigger: consumePendingTrigger() ?? undefined,
			externalAction: action => SplashAPI.getInstance().processAction(action),
			// A spectator consumes local input so its state comes only from applied snapshots.
			interceptAction: action => spectate || (sync?.interceptAction(action) ?? false),
			onChanged: (snapshot) => {
				sync?.onChanged(snapshot);
				presence?.onChanged(snapshot);
			},
		});
		if (pageUuid) registerRuntime(pageUuid, runtime);
		if (synced) sync = createSyncDriver(pageUuid!, splashConfig, runtime);
		if (reportsPresence) presence = createPresenceReporter(pageUuid!);
		await runtime.initialize({ skipAnimations });
		await sync?.connect();
		loading = false;
		// Play the splash out before the app tears down (unless an emergency close passes skipOutro).
		foundryApp.onPreClose = () => runtime?.playOut();
	});

	const closeHook = Hooks.on('splash.close-splash', (opts?: { skipOutro?: boolean }) => {
		foundryApp.close({ skipOutro: !!opts?.skipOutro });
	});

	const changeStatesHook = Hooks.on(
		'splash.change-states',
		({ load, unload }: { load?: string[]; unload?: string[] }) => {
			runtime?.changeStates({ load, unload });
		},
	);

	onDestroy(() => {
		presence?.dispose();
		sync?.dispose();
		if (pageUuid && runtime) unregisterRuntime(pageUuid, runtime);
		runtime?.destroy();
		Hooks.off('splash.close-splash', closeHook);
		Hooks.off('splash.change-states', changeStatesHook);
	});
</script>

<div class='splash-stage'>
	{#if loading}
		<div class='loading'><span>{game.i18n.localize('splash.ui.splashUI.loading')}</span></div>
	{/if}
	{#if rendererKind === 'webgl'}
		<canvas bind:this={view}></canvas>
	{:else}
		<div class='html-stage' bind:this={htmlStage}></div>
	{/if}
</div>

<style lang='stylus'>
  // Frameless ApplicationV2 host spans the screen without window theming; per-layer stacking is set in css/splash.scss.
  :global(#splash-application)
    position fixed
    inset 0
    margin 0
    padding 0
    border none
    background none

  // Sized relative to the host so the same component works fullscreen and in handout windows.
  .splash-stage
    position absolute
    inset 0

  .html-stage
    position relative
    width 100%
    height 100%
    overflow hidden

  .loading
    z-index -1
    color white
    position absolute
    width 100%
    height 100%
    background #00000050
    align-content center
    text-align center
    font-size 40px

</style>
