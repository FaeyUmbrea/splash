<script lang='ts'>
	import type { SplashInitialized } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import { onDestroy, onMount } from 'svelte';
	import { PixiRenderer } from '../renderer/PixiRenderer.ts';
	import { SplashRuntime } from '../renderer/SplashRuntime.ts';

	export let foundryApp: SvelteApplication;

	export let popover;

	export let splashConfig: SplashInitialized;

	let view: HTMLCanvasElement;
	let loading = true;
	let runtime: SplashRuntime | undefined;

	onMount(async () => {
		const renderer = new PixiRenderer(view);
		runtime = new SplashRuntime(splashConfig, renderer, (event, ...args) => Hooks.call(event, ...args));
		await runtime.initialize();
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

<div class={popover ? 'popover' : ''}>
	{#if loading}
		<div class='loading'><span>Loading</span></div>
	{/if}
	<canvas bind:this={view}></canvas>
</div>

<style lang='stylus'>
  // The frameless ApplicationV2 host element must span the screen without Foundry's window theming.
  :global(#splash-application)
    position fixed
    inset 0
    margin 0
    padding 0
    border none
    background none

  div
    z-index 2
    position absolute
    width 100vw
    height 100vh
  .popover
    z-index 200

  .loading
    z-index -1
    color white
    position absolute
    width 100vw
    height 100vh
    background #00000050
    align-content center
    text-align center
    font-size 40px

</style>
