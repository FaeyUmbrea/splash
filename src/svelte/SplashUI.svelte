<script lang='ts'>
	import type { SplashInitialized } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import { onDestroy, onMount } from 'svelte';
	import { HtmlRenderer } from '../renderer/HtmlRenderer.svelte.ts';
	import { PixiRenderer } from '../renderer/PixiRenderer.ts';
	import { selectRenderer } from '../renderer/selectRenderer.ts';
	import { SplashRuntime } from '../renderer/SplashRuntime.ts';

	export let foundryApp: SvelteApplication;

	export let splashConfig: SplashInitialized;

	/** Restored splashes appear instantly so nothing behind them is glimpsed. */
	export let skipAnimations: boolean = false;

	const rendererKind = selectRenderer();

	let view: HTMLCanvasElement;
	let htmlStage: HTMLDivElement;
	let loading = true;
	let runtime: SplashRuntime | undefined;

	onMount(async () => {
		const renderer = rendererKind === 'webgl' ? new PixiRenderer(view) : new HtmlRenderer(htmlStage);
		runtime = new SplashRuntime(splashConfig, renderer, (event, ...args) => Hooks.call(event, ...args));
		await runtime.initialize({ skipAnimations });
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
