<svelte:options runes={true} />
<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import { spriteComponents } from '../components/index.ts';

	interface Placement { x?: number; y?: number; width?: number | null; height?: number | null; zIndex?: number; skewX?: number; skewY?: number }

	const {
		sprite,
		placement,
		fallback,
		highlighted = false,
		dx = 0,
		dy = 0,
		dw = 0,
		dh = 0,
		onPointerDown,
		onContext,
		onDblClick,
	}: {
		sprite: SpriteCreate;
		placement: Placement;
		fallback: { width?: number; height?: number };
		/** True when this object is part of the current selection; selection itself is drawn as one box by the canvas. */
		highlighted?: boolean;
		/** Live gesture offsets applied during a drag/resize, in stage pixels. */
		dx?: number;
		dy?: number;
		dw?: number;
		dh?: number;
		onPointerDown: (event: PointerEvent) => void;
		onContext: (event: MouseEvent) => void;
		onDblClick?: (event: MouseEvent) => void;
	} = $props();

	const Component = $derived(spriteComponents[sprite.type ?? '']);
	const baseW = $derived(placement.width ?? fallback.width ?? null);
	const baseH = $derived(placement.height ?? fallback.height ?? null);

	const renderX = $derived((placement.x ?? 0) + dx);
	const renderY = $derived((placement.y ?? 0) + dy);
	const renderW = $derived(baseW != null ? Math.max(10, baseW + dw) : null);
	const renderH = $derived(baseH != null ? Math.max(10, baseH + dh) : null);
	const skew = $derived((placement.skewX ?? 0) || (placement.skewY ?? 0) ? `skew(${placement.skewX ?? 0}deg, ${placement.skewY ?? 0}deg)` : undefined);
</script>

<div
	class='editor-sprite'
	class:highlighted
	role='button'
	tabindex='-1'
	style:left='{renderX}px'
	style:top='{renderY}px'
	style:width={renderW ? `${renderW}px` : 'auto'}
	style:height={renderH ? `${renderH}px` : 'auto'}
	style:z-index={(placement.zIndex ?? 0) + 1000}
	style:transform={skew}
	onpointerdown={onPointerDown}
	oncontextmenu={onContext}
	ondblclick={onDblClick}
>
	<div class='content'>
		{#if Component}<Component {sprite} />{/if}
	</div>
</div>

<style lang='scss'>
	.editor-sprite {
		position: absolute;
		cursor: move;
		outline: 1px dashed #ffffff40;

		&.highlighted {
			outline: 2px solid #ffb74d;
		}

		.content {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}
	}
</style>
