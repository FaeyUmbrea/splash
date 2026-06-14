<svelte:options runes={true} />
<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { ContextMenuItem } from '../ui';
	import type { DocumentStore } from './documentStore.svelte.ts';
	import type { SpriteType } from './spriteFactory.ts';
	import { nanoid } from 'nanoid';
	import { spriteDefaultSize } from '../components/index.ts';
	import { ContextMenu } from '../ui';
	import { addSprite, removeSprite, setChildren, setSpritePlacement } from './edit.ts';
	import EditorSprite from './EditorSprite.svelte';
	import { createSprite } from './spriteFactory.ts';

	const {
		store,
		activeState,
		selectedId,
		onSelect,
	}: {
		store: DocumentStore;
		activeState: string;
		selectedId: string | null;
		onSelect: (id: string | null) => void;
	} = $props();

	const data = $derived(store.data);
	const children = $derived((data.children ?? []) as SpriteCreate[]);
	const isHandout = $derived(data.layer === 'handout');
	// Handout: confine the canvas to a centered frame of the declared size (WYSIWYG with the
	// locked window). Fullscreen: the frame is the whole viewport.
	const frameStyle = $derived(
		isHandout && data.handoutSize
			? `width:${data.handoutSize.width}px;height:${data.handoutSize.height}px;`
			: '',
	);

	// The editor edits exactly the placements of the active state.
	const placed = $derived(children.filter(c => c?.states?.[activeState]));

	let frameEl = $state<HTMLElement | null>(null);
	let menu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	function commitPlacement(spriteId: string, patch: Record<string, number>) {
		const next = foundry.utils.deepClone(children);
		const placement = next.find(c => c?.id === spriteId)?.states?.[activeState];
		if (!placement) return;
		Object.assign(placement, patch);
		void setChildren(store.page, next);
	}

	/** Map a screen point to frame-relative canvas coordinates (handles the handout letterbox). */
	function toCanvas(clientX: number, clientY: number) {
		const r = frameEl?.getBoundingClientRect();
		return { x: Math.round(clientX - (r?.left ?? 0)), y: Math.round(clientY - (r?.top ?? 0)) };
	}

	function addAt(type: SpriteType, clientX: number, clientY: number) {
		const sprite = createSprite(type, activeState);
		const pos = toCanvas(clientX, clientY);
		const placement = sprite.states?.[activeState] as Record<string, number> | undefined;
		if (placement) {
			placement.x = pos.x;
			placement.y = pos.y;
		}
		void addSprite(store.page, children, sprite);
		onSelect(sprite.id ?? null);
		menu = null;
	}

	function emptyMenu(event: MouseEvent) {
		event.preventDefault();
		const { clientX, clientY } = event;
		menu = {
			x: clientX,
			y: clientY,
			items: [
				{ label: 'Add image here', icon: 'fa-solid fa-image', action: () => addAt('image', clientX, clientY) },
				{ label: 'Add text here', icon: 'fa-solid fa-font', action: () => addAt('text', clientX, clientY) },
				{ label: 'Add button here', icon: 'fa-solid fa-hand-pointer', action: () => addAt('button', clientX, clientY) },
			],
		};
	}

	function zExtent(extreme: 'front' | 'back'): number {
		const zs = placed.map(c => (c.states?.[activeState]?.zIndex as number) ?? 0);
		if (!zs.length) return 0;
		return extreme === 'front' ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
	}

	function spriteMenu(event: MouseEvent, sprite: SpriteCreate) {
		event.preventDefault();
		event.stopPropagation();
		onSelect(sprite.id ?? null);
		menu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				{ label: 'Duplicate', icon: 'fa-solid fa-clone', action: () => duplicate(sprite) },
				{ label: 'Bring to front', icon: 'fa-solid fa-arrow-up', action: () => commitPlacement(sprite.id ?? '', { zIndex: zExtent('front') }) },
				{ label: 'Send to back', icon: 'fa-solid fa-arrow-down', action: () => commitPlacement(sprite.id ?? '', { zIndex: zExtent('back') }) },
				{ label: `Remove from "${activeState}"`, icon: 'fa-solid fa-eye-slash', action: () => void setSpritePlacement(store.page, children, sprite.id ?? '', activeState, null) },
				{ separator: true },
				{ label: 'Delete', icon: 'fa-solid fa-trash', danger: true, action: () => deleteSprite(sprite) },
			],
		};
	}

	function deleteSprite(sprite: SpriteCreate) {
		void removeSprite(store.page, children, sprite.id ?? '');
		if (selectedId === sprite.id) onSelect(null);
	}

	function duplicate(sprite: SpriteCreate) {
		const copy = foundry.utils.deepClone(sprite);
		copy.id = nanoid();
		copy.name = `${sprite.name ?? 'Sprite'} copy`;
		void addSprite(store.page, children, copy);
		onSelect(copy.id ?? null);
	}
</script>

<div class='canvas-backdrop' class:handout={isHandout} role='presentation' onpointerdown={() => onSelect(null)} oncontextmenu={emptyMenu}>
	<div class='canvas-frame' class:framed={isHandout} style={frameStyle} bind:this={frameEl}>
		{#each placed as sprite (sprite.id)}
			<EditorSprite
				{sprite}
				placement={sprite.states[activeState]}
				fallback={spriteDefaultSize(sprite.type)}
				selected={sprite.id === selectedId}
				onSelect={() => onSelect(sprite.id ?? null)}
				onCommit={patch => commitPlacement(sprite.id ?? '', patch)}
				onContext={e => spriteMenu(e, sprite)}
			/>
		{/each}
	</div>
</div>

{#if menu}
	<ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => (menu = null)} />
{/if}

<style lang='scss'>
	.canvas-backdrop {
		position: absolute;
		inset: 0;
		// Own stacking context so sprites' (+1000) z-indices stay contained below the side panels.
		z-index: 0;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;

		// Dim the area around a framed handout so the frame reads as the real window bounds.
		&.handout {
			background: #000000aa;
		}
	}

	.canvas-frame {
		position: relative;
		width: 100%;
		height: 100%;

		&.framed {
			flex: 0 0 auto;
			background: #00000040;
			box-shadow: 0 0 0 1px #ff980080;
		}
	}
</style>
