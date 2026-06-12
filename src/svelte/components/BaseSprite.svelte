<script lang='ts'>
	import type { Component } from 'svelte';
	import type { SpriteInitialized, StateInitialized } from '../../datamodel/SplashModel.ts';
	import { spriteDefaultSize } from './index.ts';

	export let sprite: SpriteInitialized;
	export let state: StateInitialized;
	export let component: Component<any>;

	$: fallback = spriteDefaultSize(sprite.type);
</script>

<div
	class='splash-sprite'
	id='splash-sprite-{sprite.id}'
	style:left='{state.x ?? 0}px'
	style:top='{state.y ?? 0}px'
	style:width={(state.width ?? fallback.width) ? `${state.width ?? fallback.width}px` : 'auto'}
	style:height={(state.height ?? fallback.height) ? `${state.height ?? fallback.height}px` : 'auto'}
	style:z-index={state.zIndex ?? 0}
>
	<svelte:component this={component} {sprite} />
</div>

<style>
	.splash-sprite {
		position: absolute;
	}
</style>
