<svelte:options runes={true} />
<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import { spriteComponents } from '../components/index.ts';

	interface Placement { x?: number; y?: number; width?: number | null; height?: number | null; zIndex?: number }

	const {
		sprite,
		placement,
		fallback,
		selected,
		dx = 0,
		dy = 0,
		dw = 0,
		dh = 0,
		onPointerDown,
		onResizeStart,
		onContext,
	}: {
		sprite: SpriteCreate;
		placement: Placement;
		fallback: { width?: number; height?: number };
		selected: boolean;
		/** Live gesture offsets applied by the canvas during a drag/resize (stage pixels). */
		dx?: number;
		dy?: number;
		dw?: number;
		dh?: number;
		onPointerDown: (event: PointerEvent) => void;
		onResizeStart: (event: PointerEvent) => void;
		onContext: (event: MouseEvent) => void;
	} = $props();

	const Component = $derived(spriteComponents[sprite.type ?? '']);
	const baseW = $derived(placement.width ?? fallback.width ?? null);
	const baseH = $derived(placement.height ?? fallback.height ?? null);

	const renderX = $derived((placement.x ?? 0) + dx);
	const renderY = $derived((placement.y ?? 0) + dy);
	const renderW = $derived(baseW != null ? Math.max(10, baseW + dw) : null);
	const renderH = $derived(baseH != null ? Math.max(10, baseH + dh) : null);
</script>

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
	onpointerdown={onPointerDown}
	oncontextmenu={onContext}
>
	<div class='content'>
		{#if Component}<Component {sprite} />{/if}
	</div>
	{#if selected}
		<div class='resize-handle' role='button' tabindex='-1' aria-label='Resize' onpointerdown={onResizeStart}></div>
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
