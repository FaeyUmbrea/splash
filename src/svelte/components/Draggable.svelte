<script lang='ts'>
	import type { DraggableSpriteInitialized } from '../../datamodel/SplashModel.ts';
	import type { SplashValues, SpriteContext } from '../../renderer/SplashRenderer.ts';
	import { onDestroy, onMount } from 'svelte';
	import { DragBehavior } from '../../renderer/dragController.ts';

	export let sprite: DraggableSpriteInitialized;
	export let values: SplashValues = {};
	export let context: SpriteContext = { onAction: () => {} };
	// Unused, but accepted so BaseSprite can pass the same prop set to every sprite component.
	export const overrides: Record<string, unknown> = {};

	let root: HTMLDivElement;
	let behavior: DragBehavior | undefined;

	$: occupied = String(values[sprite.valueKey ?? ''] ?? '');

	onMount(() => {
		// In the runtime each sprite sits in a `.splash-sprite` wrapper; the shared host is its parent. In the editor
		// there is no wrapper and the preview is inert (the canvas swallows pointer events), so the fallback is fine.
		const host = (root.closest('.splash-sprite')?.parentElement ?? root.parentElement ?? document.body) as HTMLElement;
		behavior = new DragBehavior(root, host, {
			tag: sprite.tag ?? '',
			onDrop: zone => void context.onAction({ type: 'drop', zone }),
		});
		behavior.settle(occupied);
	});
	onDestroy(() => behavior?.destroy());

	$: behavior?.settle(occupied);
</script>

<div
	bind:this={root}
	class='splash-draggable'
	style:background-color={sprite.fill || 'transparent'}
	style:background-image={sprite.img ? `url("${sprite.img}")` : 'none'}
	style:border-radius='{sprite.radius ?? 0}px'
></div>

<style>
	.splash-draggable {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center;
		user-select: none;
	}
</style>
