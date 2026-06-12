<script lang='ts'>
	import type { SpriteCreate, StateCreate } from '../../datamodel/SplashModel.ts';
	import { createEventDispatcher } from 'svelte';
	import { spriteComponents, spriteDefaultSize } from '../components/index.ts';

	export let sprite: SpriteCreate;
	export let state: StateCreate;
	export let selected: boolean;

	$: fallback = spriteDefaultSize(sprite.type);

	const dispatch = createEventDispatcher<{ select: void; change: void }>();

	let drag: { startX: number; startY: number; x: number; y: number; width: number | null; height: number | null; resize: boolean } | null = null;

	function onPointerDown(event: PointerEvent, resize: boolean = false) {
		event.preventDefault();
		event.stopPropagation();
		dispatch('select');
		drag = {
			startX: event.clientX,
			startY: event.clientY,
			x: state.x ?? 0,
			y: state.y ?? 0,
			width: state.width ?? fallback.width ?? null,
			height: state.height ?? fallback.height ?? null,
			resize,
		};
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	function onPointerMove(event: PointerEvent) {
		if (!drag) return;
		const dx = event.clientX - drag.startX;
		const dy = event.clientY - drag.startY;
		if (drag.resize) {
			state.width = Math.max(10, Math.round((drag.width ?? 100) + dx));
			state.height = Math.max(10, Math.round((drag.height ?? 100) + dy));
		} else {
			state.x = Math.round(drag.x + dx);
			state.y = Math.round(drag.y + dy);
		}
		dispatch('change');
	}

	function onPointerUp() {
		drag = null;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
	}
</script>

<!-- z-index is offset so negative data values still hit-test above the canvas backdrop. -->
<div
	class='editor-sprite'
	class:selected
	style:left='{state.x ?? 0}px'
	style:top='{state.y ?? 0}px'
	style:width={(state.width ?? fallback.width) ? `${state.width ?? fallback.width}px` : 'auto'}
	style:height={(state.height ?? fallback.height) ? `${state.height ?? fallback.height}px` : 'auto'}
	style:z-index={(state.zIndex ?? 0) + 1000}
	on:pointerdown={onPointerDown}
>
	<div class='content'>
		<svelte:component this={spriteComponents[sprite.type ?? '']} {sprite} />
	</div>
	{#if selected}
		<div
			class='resize-handle'
			title='Resize'
			on:pointerdown={event => onPointerDown(event, true)}
		></div>
	{/if}
</div>

<style lang='scss'>
	.editor-sprite {
		position: absolute;
		cursor: move;
		outline: 1px dashed #ffffff40;

		&.selected {
			outline: 2px solid #ff9800;
		}

		// Sprites must not swallow pointer events in edit mode (e.g. buttons firing actions).
		.content {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.resize-handle {
			position: absolute;
			right: -6px;
			bottom: -6px;
			width: 12px;
			height: 12px;
			background: #ff9800;
			border: 1px solid #000;
			cursor: nwse-resize;
		}
	}
</style>
