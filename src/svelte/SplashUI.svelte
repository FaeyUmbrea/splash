<script lang='ts'>
	import type {
		ButtonSpriteInitialized,
		ImageSpriteInitialized,
		SplashInitialized,
		SpriteInitialized,
		StateInitialized,
	} from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import { onDestroy, onMount } from 'svelte';
	import { SplashAPI } from '../api/api.js';
	import { getChildrenWithState, transitionState } from '../utils/helpers.js';

	export let foundryApp: SvelteApplication;

	export let popover;

	export let splashConfig: SplashInitialized;

	let app: PIXI.Application;
	let view: HTMLCanvasElement;

	let loading = true;

	// Plain Map on purpose: PIXI bookkeeping only, never read from the template.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const instantiatedChildren: Map<string, PIXI.DisplayObject> = new Map();
	const api = SplashAPI.getInstance();
	let loadedStates: string[] = [];

	onMount(async () => {
		app = new PIXI.Application({
			view,
			backgroundAlpha: 0,
			width: window.innerWidth,
			height: window.innerHeight,
		});
		app.stage.sortableChildren = true;
		app.ticker.maxFPS = game?.canvas?.app?.ticker?.maxFPS ?? 60;
		for (const c1 of splashConfig.children.filter(c => c.type === 'image')) {
			await PIXI.Assets.load((c1 as ImageSpriteInitialized).img);
		}
		for (const c1 of splashConfig.children.filter(c => c.type === 'button')) {
			const image = (c1 as ButtonSpriteInitialized).image?.url;
			if (image) await PIXI.Assets.load(image);
			const hoverImage = (c1 as ButtonSpriteInitialized).hoverImage?.url;
			if (hoverImage) await PIXI.Assets.load(hoverImage);
			const clickImage = (c1 as ButtonSpriteInitialized).clickImage?.url;
			if (clickImage) await PIXI.Assets.load(clickImage);
		}
		for (const state of splashConfig.initialState) {
			if (state)
				await loadState(state);
		}
		loading = false;
	});

	let changingBlocked = false;

	function determineState(child: SpriteInitialized, statesToLoad: string[]) {
		let nextState;
		for (const stateId of statesToLoad) {
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

	async function loadChild(child: SpriteInitialized, state: StateInitialized) {
		if (!state) return 0;
		const animation = state.animIn ?? child.animIn ?? splashConfig.animIn;
		const timeout = animation
			? (animation.delay ?? 0) + (animation.duration ?? 3000)
			: 0;
		const sprite = await api.buildSprite(child, state);
		if (!sprite) return 0;
		if (animation) {
			await api.buildAnimation(animation, sprite, app);
		}
		app.stage.addChild(sprite);
		instantiatedChildren.set(child.id, sprite);
		return timeout;
	}

	async function loadState(stateId: string) {
		if (loadedStates.includes(stateId)) return;
		const children = getChildrenWithState(splashConfig, stateId);
		let longestTimeout = 0;
		if (children.length > 0) {
			for (const child of children) {
				const state = determineState(child, [stateId, ...loadedStates]);
				if (!state) continue;
				const instantiatedChild = instantiatedChildren.get(child.id);
				if (!instantiatedChild) {
					longestTimeout = Math.max(
						longestTimeout,
						await loadChild(child, state),
					);
				} else {
					transitionState(instantiatedChild, state);
				}
			}
		}
		loadedStates.push(stateId);
		return longestTimeout;
	}

	async function unloadState(stateId: string) {
		if (!loadedStates.includes(stateId)) return;
		let longestTimeout = 0;
		const children = getChildrenWithState(splashConfig, stateId);
		for (const child of children) {
			if (instantiatedChildren.has(child.id)) {
				const remainingStates = loadedStates.filter(c => c !== stateId);
				const value = instantiatedChildren.get(child.id)!;
				if (remainingStates.some(c => Object.keys(child.states).includes(c))) {
					const state = determineState(child, remainingStates);
					if (!state) continue;
					transitionState(value, state);
				} else {
					const state = child.states[stateId]!;
					const animation
						= child.animOut ?? state.animOut ?? splashConfig.animOut;
					if (animation) {
						await api.buildAnimation(animation, value, app);
						const timeout
							= (animation.delay ?? 0) + (animation.duration ?? 3000);
						setTimeout(() => {
							value.destroy();
							app.stage.removeChild(value);
							instantiatedChildren.delete(child.id);
						}, timeout);
						longestTimeout = Math.max(longestTimeout, timeout);
					} else {
						value.destroy();
						app.stage.removeChild(value);
						instantiatedChildren.delete(child.id);
					}
				}
			}
		}
		loadedStates = loadedStates.filter(state => state !== stateId);
		return longestTimeout;
	}

	const closeHook = Hooks.on('splash.close-splash', () => {
		foundryApp.close();
	});

	const loadStateHook = Hooks.on(
		'splash.change-states',
		async ({ load, unload }: { load?: string[]; unload?: string[] }) => {
			if (changingBlocked) return;
			changingBlocked = true;
			let longestTimeout = 0;
			if (load) {
				for (const name of load) {
					Hooks.call('splash.loading-state', name);
					longestTimeout = Math.max(
						longestTimeout,
						(await loadState(name)) ?? 0,
					);
					Hooks.call('splash.loaded-state', name);
				}
			}
			if (unload) {
				for (const name of unload) {
					Hooks.call('splash.unloading-state', name);
					longestTimeout = Math.max(
						longestTimeout,
						(await unloadState(name)) ?? 0,
					);
					Hooks.call('splash.unloaded-state', name);
				}
			}
			if (longestTimeout > 0) {
				setTimeout(() => {
					changingBlocked = false;
					Hooks.call('splash.changed-states', { load, unload });
				}, longestTimeout);
			} else {
				changingBlocked = false;
				Hooks.call('splash.changed-states', { load, unload });
			}
		},
	);

	onDestroy(() => {
		app.stop();
		app.stage.destroy();
		Hooks.off('splash.close-splash', closeHook);
		Hooks.off('splash.change-states', loadStateHook);
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
