<script lang='ts'>
	import type { SplashInitialized } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';
	import { onMount } from 'svelte';
	import { SplashPlayback } from '../apps/SplashPlayback.ts';
	import { HtmlRenderer } from '../renderer/HtmlRenderer.svelte.ts';
	import { PixiRenderer } from '../renderer/PixiRenderer.ts';
	import { selectRenderer } from '../renderer/selectRenderer.ts';

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
	let failed = false;

	/** Observe playback state without attaching preview data to a world document. */
	export let onSnapshot: ((snapshot: RuntimeSnapshot) => void) | undefined;
	/** Preview can keep its controls open when a handout requests closure. */
	export let onCloseRequested: ((skipOutro: boolean) => void) | undefined;

	onMount(() => {
		const renderer = rendererKind === 'webgl' ? new PixiRenderer(view) : new HtmlRenderer(htmlStage);
		const playback = new SplashPlayback(splashConfig, renderer, {
			app: foundryApp,
			pageUuid,
			spectate,
			skipAnimations,
			onSnapshot,
			onClose: onCloseRequested,
		});
		void playback.start().then((ready) => {
			if (ready) loading = false;
		}).catch((error) => {
			console.error('Splash | Playback failed to initialise.', error);
			loading = false;
			failed = true;
		});
		return () => playback.dispose();
	});

</script>

<div class='splash-stage'>
	{#if failed}
		<div class='loading'><span>{game.i18n.localize('splash.ui.splashUI.failed')}</span></div>
	{:else if loading}
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
