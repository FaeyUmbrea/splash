<script lang='ts'>
	import type { SplashCreate } from '../../datamodel/SplashModel.ts';
	import { createEventDispatcher } from 'svelte';
	import EditorSprite from './EditorSprite.svelte';

	export let working: SplashCreate;
	export let activeState: string;
	export let selectedId: string | null;

	const dispatch = createEventDispatcher<{ select: string | null; change: void }>();

	// The canvas edits exactly the placements of the active state; runtime
	// state-cascading is a playback concern and would mislead here.
	$: placed = (working.children ?? []).filter(child => child?.states?.[activeState]);
</script>

<div class='editor-canvas' on:pointerdown={() => dispatch('select', null)}>
	{#each placed as sprite (sprite.id)}
		<EditorSprite
			{sprite}
			state={sprite.states[activeState]}
			selected={sprite.id === selectedId}
			on:select={() => dispatch('select', sprite.id ?? null)}
			on:change={() => dispatch('change')}
		/>
	{/each}
</div>

<style>
	.editor-canvas {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
</style>
