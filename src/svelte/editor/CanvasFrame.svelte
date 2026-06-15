<svelte:options runes={true} />
<script lang='ts'>
	import type { ContextMenuItem } from '../ui';
	import type { EditorModel, EditorObject } from './editorModel.svelte.ts';
	import type { SpriteType } from './spriteFactory.ts';
	import { spriteDefaultSize } from '../components/index.ts';
	import { ContextMenu } from '../ui';
	import EditorSprite from './EditorSprite.svelte';

	const { model }: { model: EditorModel } = $props();

	const SNAP = 8; // stage-pixel snap threshold
	const MAX_SNAP_SPEED = 1.6; // screen px/ms — drag faster than this and snapping stays off

	// Pointer-velocity tracking, to suppress snapping during fast drags.
	let lastPX = 0;
	let lastPY = 0;
	let lastPT = 0;

	let regionW = $state(0);
	let regionH = $state(0);
	let stageEl = $state<HTMLElement | null>(null);
	let menu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	interface Snap { pi: number; line: number }
	type Gesture = { kind: 'move' | 'resize'; startX: number; startY: number; ids: string[]; primaryId: string; baseW: number; baseH: number; dx: number; dy: number; dw: number; dh: number; snapX: Snap | null; snapY: Snap | null; locked: 'x' | 'y' | null };
	let gesture = $state<Gesture | null>(null);
	let marquee = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

	const isHandout = $derived(model.data.layer === 'handout');
	const stageW = $derived(isHandout ? (model.data.handoutSize?.width ?? 800) : (globalThis.innerWidth || 1920));
	const stageH = $derived(isHandout ? (model.data.handoutSize?.height ?? 600) : (globalThis.innerHeight || 1080));
	const scale = $derived(Math.min((regionW * 0.96) / stageW, (regionH * 0.96) / stageH) || 1);
	const offsetX = $derived(Math.max(0, (regionW - stageW * scale) / 2));
	const offsetY = $derived(Math.max(0, (regionH - stageH * scale) / 2));

	const marqueeRect = $derived(marquee
		? { x: Math.min(marquee.x0, marquee.x1), y: Math.min(marquee.y0, marquee.y1), w: Math.abs(marquee.x1 - marquee.x0), h: Math.abs(marquee.y1 - marquee.y0) }
		: null);

	function rectOf(obj: EditorObject) {
		const p = obj.placement ?? {};
		const fb = spriteDefaultSize(obj.type);
		return { x: p.x ?? 0, y: p.y ?? 0, w: p.width ?? fb.width ?? 100, h: p.height ?? fb.height ?? 40 };
	}

	function toStage(clientX: number, clientY: number) {
		const r = stageEl?.getBoundingClientRect();
		return { x: Math.round((clientX - (r?.left ?? 0)) / scale), y: Math.round((clientY - (r?.top ?? 0)) / scale) };
	}

	// --- snapping ------------------------------------------------------------

	const RELEASE = 14; // sticky release threshold — wider than SNAP to stop snap/unsnap chatter

	/** Snap lines for an axis: stage edges/center plus every OTHER in-state object's edges/center. */
	function snapLines(axis: 'x' | 'y'): number[] {
		const lines = axis === 'x' ? [0, stageW / 2, stageW] : [0, stageH / 2, stageH];
		for (const o of model.objectsInState) {
			if (!o.inState || gesture?.ids.includes(o.id)) continue;
			const r = rectOf(o);
			if (axis === 'x') lines.push(r.x, r.x + r.w / 2, r.x + r.w);
			else lines.push(r.y, r.y + r.h / 2, r.y + r.h);
		}
		return lines;
	}

	/**
	 * Snap one of an object's reference points (e.g. left/center/right) to a line. It LOCKS onto a
	 * specific (point, line) pair and keeps aligning THAT point until it drifts past RELEASE — so it
	 * never flips which point aligns to a line mid-drag (the cause of the stutter).
	 */
	function snap1D(refs: number[], lines: number[], current: Snap | null): { snap: Snap | null; offset: number } {
		if (current && Math.abs(current.line - refs[current.pi]) <= RELEASE) {
			return { snap: current, offset: current.line - refs[current.pi] };
		}
		let best: Snap | null = null;
		let bestDist = SNAP + 1;
		for (let pi = 0; pi < refs.length; pi++) {
			for (const line of lines) {
				const d = Math.abs(line - refs[pi]);
				if (d < bestDist) {
					bestDist = d;
					best = { pi, line };
				}
			}
		}
		return best ? { snap: best, offset: best.line - refs[best.pi] } : { snap: null, offset: 0 };
	}

	// --- gesture drag (move group / resize one) ------------------------------

	function addListeners() {
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}
	function removeListeners() {
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
	}

	function resetVelocity(event: PointerEvent) {
		lastPX = event.clientX;
		lastPY = event.clientY;
		lastPT = event.timeStamp;
	}

	function onSpritePointerDown(event: PointerEvent, obj: EditorObject) {
		event.preventDefault();
		event.stopPropagation();
		if (event.button !== 0) return;
		const additive = event.shiftKey || event.ctrlKey || event.metaKey;
		if (additive) model.select(obj.id, true);
		else if (!model.isSelected(obj.id)) model.select(obj.id);
		if (!model.isSelected(obj.id)) return;
		gesture = { kind: 'move', startX: event.clientX, startY: event.clientY, ids: [...model.selectedIds], primaryId: obj.id, baseW: 0, baseH: 0, dx: 0, dy: 0, dw: 0, dh: 0, snapX: null, snapY: null, locked: null };
		resetVelocity(event);
		addListeners();
	}

	function onResizeStart(event: PointerEvent, obj: EditorObject) {
		event.preventDefault();
		event.stopPropagation();
		const r = rectOf(obj);
		gesture = { kind: 'resize', startX: event.clientX, startY: event.clientY, ids: [obj.id], primaryId: obj.id, baseW: r.w, baseH: r.h, dx: 0, dy: 0, dw: 0, dh: 0, snapX: null, snapY: null, locked: null };
		resetVelocity(event);
		addListeners();
	}

	function onPointerMove(event: PointerEvent) {
		if (marquee) {
			const p = toStage(event.clientX, event.clientY);
			marquee = { ...marquee, x1: p.x, y1: p.y };
			return;
		}
		if (!gesture) return;
		const rdx = (event.clientX - gesture.startX) / scale;
		const rdy = (event.clientY - gesture.startY) / scale;
		const prim = model.objectsInState.find(o => o.id === gesture!.primaryId);
		const r = prim ? rectOf(prim) : { x: 0, y: 0, w: 0, h: 0 };
		const dt = event.timeStamp - lastPT;
		const speed = dt > 0 ? Math.hypot(event.clientX - lastPX, event.clientY - lastPY) / dt : 0;
		lastPX = event.clientX;
		lastPY = event.clientY;
		lastPT = event.timeStamp;
		const snapping = !event.altKey && !!prim && speed < MAX_SNAP_SPEED;

		if (gesture.kind === 'resize') {
			let dw = rdx;
			let dh = rdy;
			let snapX: Snap | null = null;
			let snapY: Snap | null = null;
			if (snapping) {
				const sx = snap1D([r.x + r.w + dw], snapLines('x'), gesture.snapX);
				const sy = snap1D([r.y + r.h + dh], snapLines('y'), gesture.snapY);
				dw += sx.offset;
				dh += sy.offset;
				snapX = sx.snap;
				snapY = sy.snap;
			}
			gesture = { ...gesture, dw, dh, snapX, snapY };
			return;
		}

		// Ctrl locks movement to whichever axis the cursor has travelled furthest along.
		let axis: 'x' | 'y' | null = null;
		let dx = rdx;
		let dy = rdy;
		if (event.ctrlKey || event.metaKey) {
			if (Math.abs(rdx) >= Math.abs(rdy)) {
				dy = 0;
				axis = 'x';
			} else {
				dx = 0;
				axis = 'y';
			}
		}
		let snapX: Snap | null = null;
		let snapY: Snap | null = null;
		if (snapping && axis !== 'y') {
			const sx = snap1D([r.x + dx, r.x + dx + r.w / 2, r.x + dx + r.w], snapLines('x'), gesture.snapX);
			dx += sx.offset;
			snapX = sx.snap;
		}
		if (snapping && axis !== 'x') {
			const sy = snap1D([r.y + dy, r.y + dy + r.h / 2, r.y + dy + r.h], snapLines('y'), gesture.snapY);
			dy += sy.offset;
			snapY = sy.snap;
		}
		gesture = { ...gesture, dx, dy, snapX, snapY, locked: axis };
	}

	function onPointerUp(event: PointerEvent) {
		removeListeners();
		if (marquee) {
			commitMarquee(event.shiftKey);
			marquee = null;
			return;
		}
		const g = gesture;
		gesture = null;
		if (!g) return;
		if (g.kind === 'resize') {
			model.setPlacement(g.primaryId, { width: Math.round(Math.max(10, g.baseW + g.dw)), height: Math.round(Math.max(10, g.baseH + g.dh)) });
		} else if (g.dx || g.dy) {
			model.moveObjects(g.ids, g.dx, g.dy);
		}
	}

	// --- lasso marquee -------------------------------------------------------

	function onRegionPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		if (!event.shiftKey) model.clearSelection();
		const p = toStage(event.clientX, event.clientY);
		marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
		addListeners();
	}

	function commitMarquee(additive: boolean) {
		if (!marqueeRect || (marqueeRect.w < 3 && marqueeRect.h < 3)) return;
		const m = marqueeRect;
		const hit = model.objectsInState.filter((o) => {
			const r = rectOf(o);
			return r.x < m.x + m.w && r.x + r.w > m.x && r.y < m.y + m.h && r.y + r.h > m.y;
		}).map(o => o.id);
		model.selectMany(hit, additive);
	}

	// --- context menus -------------------------------------------------------

	function onDrop(event: DragEvent) {
		event.preventDefault();
		const id = event.dataTransfer?.getData('text/splash-object');
		if (!id) return;
		const pos = toStage(event.clientX, event.clientY);
		const obj = model.objects.find(o => o.id === id);
		if (!obj) return;
		if (obj.inState) model.setPlacement(id, pos);
		else model.placeInState(id, model.activeState, pos);
		model.select(id);
	}

	function emptyMenu(event: MouseEvent) {
		event.preventDefault();
		const at = toStage(event.clientX, event.clientY);
		function add(type: SpriteType) {
			model.addObject(type, at);
			menu = null;
		}
		menu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				{ label: 'Add image here', icon: 'fa-solid fa-image', action: () => add('image') },
				{ label: 'Add text here', icon: 'fa-solid fa-font', action: () => add('text') },
				{ label: 'Add button here', icon: 'fa-solid fa-hand-pointer', action: () => add('button') },
			],
		};
	}

	function spriteMenu(event: MouseEvent, obj: EditorObject) {
		event.preventDefault();
		event.stopPropagation();
		if (!model.isSelected(obj.id)) model.select(obj.id);
		const multi = model.selectedIds.length > 1;
		menu = {
			x: event.clientX,
			y: event.clientY,
			items: multi
				? [
					{ label: `Delete ${model.selectedIds.length} objects`, icon: 'fa-solid fa-trash', danger: true, action: () => model.deleteSelected() },
				]
				: [
					{ label: 'Duplicate', icon: 'fa-solid fa-clone', action: () => model.duplicateObject(obj.id) },
					{ label: 'Bring to front', icon: 'fa-solid fa-arrow-up', action: () => model.setPlacement(obj.id, { zIndex: model.zExtent('front') }) },
					{ label: 'Send to back', icon: 'fa-solid fa-arrow-down', action: () => model.setPlacement(obj.id, { zIndex: model.zExtent('back') }) },
					{ separator: true },
					{ label: 'Scale to fit stage', icon: 'fa-solid fa-expand', action: () => model.scaleToFit(obj.id) },
					{ label: 'Reset to natural size', icon: 'fa-solid fa-compress', action: () => model.resetSize(obj.id) },
					{ label: `Remove from "${model.activeState}"`, icon: 'fa-solid fa-eye-slash', action: () => model.removeFromState(obj.id) },
					{ separator: true },
					{ label: 'Delete', icon: 'fa-solid fa-trash', danger: true, action: () => model.deleteObject(obj.id) },
				],
		};
	}

	function moveDx(id: string) {
		return gesture?.kind === 'move' && gesture.ids.includes(id) ? gesture.dx : 0;
	}
	function moveDy(id: string) {
		return gesture?.kind === 'move' && gesture.ids.includes(id) ? gesture.dy : 0;
	}

	const primaryRect = $derived.by(() => {
		if (!gesture) return null;
		const o = model.objectsInState.find(p => p.id === gesture!.primaryId);
		return o ? rectOf(o) : null;
	});
</script>

<div
	class='canvas-region'
	class:handout={isHandout}
	bind:clientWidth={regionW}
	bind:clientHeight={regionH}
	role='presentation'
	ondragover={e => e.preventDefault()}
	ondrop={onDrop}
	oncontextmenu={emptyMenu}
	onpointerdown={onRegionPointerDown}
>
	<div
		class='stage'
		class:framed={isHandout}
		bind:this={stageEl}
		style={`left:${offsetX}px;top:${offsetY}px;width:${stageW}px;height:${stageH}px;transform:scale(${scale});`}
	>
		{#each model.objectsInState as obj (obj.id)}
			<EditorSprite
				sprite={obj.raw}
				placement={obj.placement ?? {}}
				fallback={spriteDefaultSize(obj.type)}
				selected={model.isSelected(obj.id)}
				dx={moveDx(obj.id)}
				dy={moveDy(obj.id)}
				dw={gesture?.kind === 'resize' && gesture.primaryId === obj.id ? gesture.dw : 0}
				dh={gesture?.kind === 'resize' && gesture.primaryId === obj.id ? gesture.dh : 0}
				onPointerDown={e => onSpritePointerDown(e, obj)}
				onResizeStart={e => onResizeStart(e, obj)}
				onContext={e => spriteMenu(e, obj)}
			/>
		{/each}

		{#if marqueeRect && (marqueeRect.w > 2 || marqueeRect.h > 2)}
			<div class='marquee' style={`left:${marqueeRect.x}px;top:${marqueeRect.y}px;width:${marqueeRect.w}px;height:${marqueeRect.h}px;`}></div>
		{/if}

		{#if gesture && primaryRect}
			{#if gesture.snapX}
				<div class='snap-line vert' style={`left:${gesture.snapX.line}px;`}></div>
			{/if}
			{#if gesture.snapY}
				<div class='snap-line horz' style={`top:${gesture.snapY.line}px;`}></div>
			{/if}
			{#if gesture.locked}
				{@const cx = primaryRect.x + primaryRect.w / 2}
				{@const cy = primaryRect.y + primaryRect.h / 2}
				<div class='drag-pip' style={`left:${cx}px;top:${cy}px;`}></div>
				{#if gesture.locked === 'x'}
					<div class='drag-line' style={`left:${Math.min(cx, cx + gesture.dx)}px;top:${cy - 1}px;width:${Math.abs(gesture.dx)}px;height:2px;`}></div>
				{:else}
					<div class='drag-line' style={`left:${cx - 1}px;top:${Math.min(cy, cy + gesture.dy)}px;width:2px;height:${Math.abs(gesture.dy)}px;`}></div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

{#if menu}
	<ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => (menu = null)} />
{/if}

<style lang='scss'>
	.canvas-region {
		position: relative;
		flex: 1;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background:
			linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
			linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
			linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
		background-size: 24px 24px;
		background-position: 0 0, 0 12px, 12px -12px, -12px 0;
		background-color: #222;
	}

	.stage {
		position: absolute;
		transform-origin: top left;
		background: #000;
		box-shadow: 0 0 0 1px #ff980066, 0 8px 40px rgba(0, 0, 0, 0.6);

		&.framed {
			box-shadow: 0 0 0 2px #ff9800aa, 0 8px 40px rgba(0, 0, 0, 0.6);
		}
	}

	.marquee {
		position: absolute;
		background: rgba(255, 144, 0, 0.12);
		border: 1px solid rgba(255, 144, 0, 0.7);
		pointer-events: none;
		z-index: 100000;
	}

	.snap-line {
		position: absolute;
		background: #ff2a2a;
		pointer-events: none;
		z-index: 100001;

		&.vert {
			top: 0;
			bottom: 0;
			width: 2px;
			margin-left: -1px;
		}

		&.horz {
			left: 0;
			right: 0;
			height: 2px;
			margin-top: -1px;
		}
	}

	.drag-line {
		position: absolute;
		background: #ffd400;
		pointer-events: none;
		z-index: 100001;
	}

	.drag-pip {
		position: absolute;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		background: #ffd400;
		border: 1px solid #000;
		pointer-events: none;
		z-index: 100002;
	}
</style>
