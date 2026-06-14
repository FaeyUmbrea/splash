<svelte:options runes={true} />
<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { ContextMenuItem } from '../ui';
	import type { DocumentStore } from './documentStore.svelte.ts';
	import type { SpriteType } from './spriteFactory.ts';
	import { ContextMenu, IconButton, ListRow, Panel } from '../ui';
	import { addSprite, removeSprite, setSpritePlacement } from './edit.ts';
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
	const children = $derived(data.children ?? []);

	const typeIcon: Record<string, string> = {
		image: 'fa-solid fa-image',
		text: 'fa-solid fa-font',
		button: 'fa-solid fa-hand-pointer',
	};

	let addMenu = $state<{ x: number; y: number } | null>(null);
	let rowMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	function placedHere(sprite: SpriteCreate): boolean {
		return !!sprite.states?.[activeState];
	}

	function add(type: SpriteType) {
		const sprite = createSprite(type, activeState);
		void addSprite(store.page, children, sprite);
		onSelect(sprite.id ?? null);
		addMenu = null;
	}

	function del(sprite: SpriteCreate) {
		void removeSprite(store.page, children, sprite.id ?? '');
		if (selectedId === sprite.id) onSelect(null);
	}

	// Stop the click bubbling to the row's select handler (which would re-select the deleted sprite).
	function delClick(event: MouseEvent, sprite: SpriteCreate) {
		event.stopPropagation();
		del(sprite);
	}

	function openRowMenu(event: MouseEvent, sprite: SpriteCreate) {
		event.preventDefault();
		const placed = placedHere(sprite);
		rowMenu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				placed
					? { label: `Remove from "${activeState}"`, icon: 'fa-solid fa-eye-slash', action: () => void setSpritePlacement(store.page, children, sprite.id ?? '', activeState, null) }
					: { label: `Place in "${activeState}"`, icon: 'fa-solid fa-plus', action: () => void setSpritePlacement(store.page, children, sprite.id ?? '', activeState, { x: 100, y: 100, zIndex: 0, priority: 0, name: '' }) },
				{ separator: true },
				{ label: 'Delete', icon: 'fa-solid fa-trash', danger: true, action: () => del(sprite) },
			],
		};
	}

	const addItems: ContextMenuItem[] = [
		{ label: 'Image', icon: 'fa-solid fa-image', action: () => add('image') },
		{ label: 'Text', icon: 'fa-solid fa-font', action: () => add('text') },
		{ label: 'Button', icon: 'fa-solid fa-hand-pointer', action: () => add('button') },
	];
</script>

<Panel title='Layers'>
	{#snippet actions()}
		<IconButton icon='fa-solid fa-plus' title='Add sprite' onclick={e => (addMenu = { x: e.clientX, y: e.clientY })} />
	{/snippet}

	<div class='layers'>
		{#each children as sprite (sprite.id)}
			<ListRow
				columns='20px 1fr 30px'
				active={sprite.id === selectedId}
				onclick={() => onSelect(sprite.id ?? null)}
				oncontextmenu={e => openRowMenu(e, sprite)}
			>
				<i class={typeIcon[sprite.type ?? ''] ?? 'fa-solid fa-shapes'} class:dim={!placedHere(sprite)}></i>
				<span class='name' class:dim={!placedHere(sprite)}>{sprite.name || sprite.id}</span>
				<IconButton icon='fa-solid fa-trash' title='Delete sprite' danger onclick={e => delClick(e, sprite)} />
			</ListRow>
		{/each}
		{#if children.length === 0}
			<div class='empty'>No sprites yet — use + to add one.</div>
		{/if}
	</div>
</Panel>

{#if addMenu}
	<ContextMenu x={addMenu.x} y={addMenu.y} items={addItems} onClose={() => (addMenu = null)} />
{/if}
{#if rowMenu}
	<ContextMenu x={rowMenu.x} y={rowMenu.y} items={rowMenu.items} onClose={() => (rowMenu = null)} />
{/if}

<style lang='scss'>
	.layers {
		display: flex;
		flex-direction: column;
		gap: 2px;

		.name {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 12px;
		}

		.dim {
			opacity: 0.4;
		}

		.empty {
			padding: 12px 4px;
			text-align: center;
			font-size: 11px;
			opacity: 0.5;
		}
	}
</style>
