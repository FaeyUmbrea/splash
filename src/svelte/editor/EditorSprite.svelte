<svelte:options runes={true} />
<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import { spriteComponents } from '../components/index.ts';

	interface Placement { x?: number; y?: number; width?: number | null; height?: number | null; zIndex?: number }
	interface Patch { x?: number; y?: number; width?: number; height?: number }

	const {
		sprite,
		placement,
		fallback,
		selected,
		onSelect,
		onCommit,
		onContext,
	}: {
		sprite: SpriteCreate;
		placement: Placement;
		fallback: { width?: number; height?: number };
		selected: boolean;
		onSelect: () => void;
		/** Commit a finished move/resize gesture — one atomic write, fired on pointer-up only. */
		onCommit: (patch: Patch) => void;
		onContext: (event: MouseEvent) => void;
	} = $props();

	// Local gesture state. During a drag the sprite renders from base + delta and writes
	// NOTHING to the document; the single atomic commit happens on pointer-up.
	let drag = $state<null | { startX: number; startY: number; baseX: number; baseY: number; baseW: number; baseH: number; resize: boolean; dx: number; dy: number }>(null);

	const Component = $derived(spriteComponents[sprite.type ?? '']);

	const renderX = $derived(drag && !drag.resize ? drag.baseX + drag.dx : (placement.x ?? 0));
	const renderY = $derived(drag && !drag.resize ? drag.baseY + drag.dy : (placement.y ?? 0));
	const renderW = $derived(drag?.resize ? Math.max(10, Math.round(drag.baseW + drag.dx)) : (placement.width ?? fallback.width ?? null));
	const renderH = $derived(drag?.resize ? Math.max(10, Math.round(drag.baseH + drag.dy)) : (placement.height ?? fallback.height ?? null));

	function onPointerDown(event: PointerEvent, resize = false) {
		event.preventDefault();
		event.stopPropagation();
		onSelect();
		drag = {
			startX: event.clientX,
			startY: event.clientY,
			baseX: placement.x ?? 0,
			baseY: placement.y ?? 0,
			baseW: placement.width ?? fallback.width ?? 100,
			baseH: placement.height ?? fallback.height ?? 100,
			resize,
			dx: 0,
			dy: 0,
		};
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	function onPointerMove(event: PointerEvent) {
		if (!drag) return;
		// Local state only — cheap, re-renders just this sprite, no document write until pointer-up.
		drag = { ...drag, dx: event.clientX - drag.startX, dy: event.clientY - drag.startY };
	}

	function onPointerUp() {
		if (drag) {
			const patch: Patch = drag.resize
				? { width: Math.round(renderW ?? 0), height: Math.round(renderH ?? 0) }
				: { x: Math.round(renderX), y: Math.round(renderY) };
			onCommit(patch);
		}
		drag = null;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
	}
</script>

<!-- z-index is offset so negative data values still hit-test above the canvas backdrop. -->
<div
	class='editor-sprite'
	class:selected
	role='button'
	tabindex='-1'
	style:left='{renderX}px'
	style:top='{renderY}px'
	style:width={renderW ? `${renderW}px` : 'auto'}
	style:height={renderH ? `${renderH}px` : 'auto'}
	style:z-index={(placement.zIndex ?? 0) + 1000}
	onpointerdown={e => onPointerDown(e)}
	oncontextmenu={onContext}
>
	<div class='content'>
		{#if Component}<Component {sprite} />{/if}
	</div>
	{#if selected}
		<div
			class='resize-handle'
			role='button'
			tabindex='-1'
			aria-label='Resize'
			onpointerdown={e => onPointerDown(e, true)}
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
