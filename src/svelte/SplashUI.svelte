<script lang='ts'>
	import type { SplashInitialized } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import type { SyncDriver } from '../utils/sync.ts';
	import { onDestroy, onMount } from 'svelte';
	import { SplashAPI } from '../api/api.ts';
	import { HtmlRenderer } from '../renderer/HtmlRenderer.svelte.ts';
	import { PixiRenderer } from '../renderer/PixiRenderer.ts';
	import { selectRenderer } from '../renderer/selectRenderer.ts';
	import { SplashRuntime } from '../renderer/SplashRuntime.ts';
	import { createSyncDriver } from '../utils/sync.ts';

	export let foundryApp: SvelteApplication;

	export let splashConfig: SplashInitialized;

	/** Source page uuid; synced mode needs it to key shared state (null = preview). */
	export let pageUuid: string | null = null;

	/** Restored splashes appear instantly so nothing behind them is glimpsed. */
	export let skipAnimations: boolean = false;

	const rendererKind = selectRenderer();

	let view: HTMLCanvasElement;
	let htmlStage: HTMLDivElement;
	let loading = true;
	let runtime: SplashRuntime | undefined;
	let sync: SyncDriver | undefined;

	// close-requested stays instance-scoped (this window only); everything else
	// becomes a regular hook for the rest of the world to observe.
	function emitEvent(event: string, ...args: unknown[]) {
		if (event === 'splash.close-requested') {
			foundryApp.close();
			return;
		}
		Hooks.call(event, ...args);
	}

	onMount(async () => {
		const renderer = rendererKind === 'webgl' ? new PixiRenderer(view) : new HtmlRenderer(htmlStage);
		const synced = splashConfig.mode === 'synced' && !!pageUuid;
		runtime = new SplashRuntime(splashConfig, renderer, emitEvent, {
			externalAction: action => SplashAPI.getInstance().processAction(action),
			interceptAction: action => sync?.interceptAction(action) ?? false,
			onChanged: snapshot => sync?.onChanged(snapshot),
		});
		if (synced) sync = createSyncDriver(pageUuid!, splashConfig, runtime);
		await runtime.initialize({ skipAnimations });
		await sync?.connect();
		loading = false;
	});

	const closeHook = Hooks.on('splash.close-splash', () => {
		foundryApp.close();
	});

	const changeStatesHook = Hooks.on(
		'splash.change-states',
		({ load, unload }: { load?: string[]; unload?: string[] }) => {
			runtime?.changeStates({ load, unload });
		},
	);

	onDestroy(() => {
		sync?.dispose();
		runtime?.destroy();
		Hooks.off('splash.close-splash', closeHook);
		Hooks.off('splash.change-states', changeStatesHook);
	});
</script>

<div class='splash-stage'>
	{#if loading}
		<div class='loading'><span>Loading</span></div>
	{/if}
	{#if rendererKind === 'webgl'}
		<canvas bind:this={view}></canvas>
	{:else}
		<div class='html-stage' bind:this={htmlStage}></div>
	{/if}
</div>

<style lang='stylus'>
  // The frameless ApplicationV2 host element must span the screen without Foundry's window theming.
  // Stacking per layer (scene/hud/full) is assigned by css/splash.scss via host classes.
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
