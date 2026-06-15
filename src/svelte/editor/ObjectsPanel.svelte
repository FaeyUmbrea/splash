<svelte:options runes={true} />
<script lang='ts'>
	import type { PresetPayload } from '../../utils/presets.ts';
	import type { ContextMenuItem } from '../ui';
	import type { EditorModel, EditorObject } from './editorModel.svelte.ts';
	import type { SpriteType } from './spriteFactory.ts';
	import { allBehaviors, getBehavior } from '../../behaviors/index.ts';
	import { promptAndSavePreset } from '../../utils/presets.ts';
	import PresetPicker from '../presets/PresetPicker.svelte';
	import { ContextMenu, IconButton } from '../ui';

	const { model }: { model: EditorModel } = $props();

	let addMenu = $state<{ x: number; y: number } | null>(null);
	let rowMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
	let prefabPicking = $state(false);

	function openPrefabPicker() {
		addMenu = null;
		prefabPicking = true;
	}
	function savePrefab() {
		const sprites = model.selectedObjects.map(o => o.raw);
		if (sprites.length) promptAndSavePreset({ type: 'spriteGroup', value: sprites } as PresetPayload, 'Prefab');
	}
	function applyPrefab(payload: PresetPayload) {
		if (payload.type === 'spriteGroup') model.applySpriteGroupPreset(payload.value);
	}

	const typeIcon: Record<string, string> = {
		image: 'fa-solid fa-image',
		text: 'fa-solid fa-font',
		button: 'fa-solid fa-hand-pointer',
		panel: 'fa-solid fa-square',
	};

	const addItems = $derived<ContextMenuItem[]>([
		{ label: 'Image', icon: 'fa-solid fa-image', action: () => add('image') },
		{ label: 'Text', icon: 'fa-solid fa-font', action: () => add('text') },
		{ label: 'Button', icon: 'fa-solid fa-hand-pointer', action: () => add('button') },
		{ label: 'Panel', icon: 'fa-solid fa-square', action: () => add('panel') },
		{ separator: true } as ContextMenuItem,
		{ label: 'Prefab…', icon: 'fa-solid fa-cubes', action: openPrefabPicker },
		...allBehaviors().map(b => ({ label: b.label, icon: b.icon, action: () => placeBehavior(b.key) })),
	]);

	function add(type: SpriteType) {
		model.addObject(type);
		addMenu = null;
	}

	async function placeBehavior(key: string) {
		addMenu = null;
		const behavior = getBehavior(key);
		if (!behavior) return;
		const content = behavior.fields
			.map(f => `<div class="form-group"><label>${f.label}</label><input type="${f.type === 'number' ? 'number' : 'text'}" name="${f.key}" value="${f.default ?? ''}" /></div>`)
			.join('');
		const config = await foundry.applications.api.DialogV2.prompt({
			window: { title: behavior.label },
			content,
			ok: {
				label: 'Place',
				callback: (_event: unknown, button: { form: HTMLFormElement }) => {
					const data: Record<string, unknown> = {};
					for (const field of behavior.fields) {
						const input = button.form.elements.namedItem(field.key) as HTMLInputElement | null;
						data[field.key] = field.type === 'number' ? Number(input?.value) : (input?.value ?? '');
					}
					return data;
				},
			},
		}).catch(() => null);
		if (!config) return;
		model.addObjects(behavior.build(config as Record<string, unknown>, { stateKey: model.activeState }));
	}

	function onDragStart(event: DragEvent, obj: EditorObject) {
		event.dataTransfer?.setData('text/splash-object', obj.id);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove';
	}

	function openRowMenu(event: MouseEvent, obj: EditorObject) {
		event.preventDefault();
		event.stopPropagation();
		rowMenu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				obj.inState
					? { label: `Remove from "${model.activeState}"`, icon: 'fa-solid fa-eye-slash', action: () => model.removeFromState(obj.id) }
					: { label: `Place in "${model.activeState}"`, icon: 'fa-solid fa-plus', action: () => model.placeInState(obj.id) },
				{ label: 'Duplicate', icon: 'fa-solid fa-clone', action: () => model.duplicateObject(obj.id) },
				{ separator: true },
				{ label: 'Delete', icon: 'fa-solid fa-trash', danger: true, action: () => model.deleteObject(obj.id) },
			],
		};
	}

	function togglePlacement(event: MouseEvent, obj: EditorObject) {
		event.stopPropagation();
		if (obj.inState) model.removeFromState(obj.id);
		else model.placeInState(obj.id);
	}
</script>

<section class='objects-panel'>
	<header>
		<span class='title'>Objects</span>
		{#if model.activeGroup}
			<IconButton icon='fa-solid fa-arrow-up-from-bracket' title='Exit group' onclick={() => model.exitGroup()} />
		{/if}
		{#if model.selectionGrouped}
			<IconButton icon='fa-solid fa-object-ungroup' title='Ungroup' onclick={() => model.ungroup()} />
		{:else if model.selectedIds.length > 1}
			<IconButton icon='fa-solid fa-object-group' title='Group selection' onclick={() => model.group()} />
		{/if}
		{#if model.selectedIds.length > 1}
			<IconButton icon='fa-solid fa-floppy-disk' title='Save selection as prefab' onclick={savePrefab} />
		{/if}
		<IconButton icon='fa-solid fa-plus' title='Add object' onclick={e => (addMenu = { x: e.clientX, y: e.clientY })} />
	</header>

	<div class='list'>
		{#each model.objects as obj (obj.id)}
			<div
				class='row'
				class:active={model.isSelected(obj.id)}
				class:dim={!obj.inState}
				role='button'
				tabindex='0'
				draggable='true'
				title={obj.inState ? '' : `Drag onto the canvas to add to "${model.activeState}"`}
				onclick={e => model.select(obj.id, e.shiftKey || e.ctrlKey || e.metaKey)}
				onkeydown={e => (e.key === 'Enter' || e.key === ' ') && model.select(obj.id)}
				oncontextmenu={e => openRowMenu(e, obj)}
				ondragstart={e => onDragStart(e, obj)}
			>
				<i class={typeIcon[obj.type] ?? 'fa-solid fa-shapes'}></i>
				<span class='name'>{obj.name}</span>
				<button
					type='button'
					class='in-state'
					class:on={obj.inState}
					title={obj.inState ? 'In this state — click to remove' : 'Not in this state — click to add'}
					aria-label='Toggle in state'
					onclick={e => togglePlacement(e, obj)}
				>
					<i class={obj.inState ? 'fa-solid fa-eye' : 'fa-regular fa-eye-slash'}></i>
				</button>
			</div>
		{/each}
		{#if model.objects.length === 0}
			<div class='empty'>No objects yet — use + to add one.</div>
		{/if}
	</div>
</section>

{#if addMenu}
	<ContextMenu x={addMenu.x} y={addMenu.y} items={addItems} onClose={() => (addMenu = null)} />
{/if}
{#if rowMenu}
	<ContextMenu x={rowMenu.x} y={rowMenu.y} items={rowMenu.items} onClose={() => (rowMenu = null)} />
{/if}
{#if prefabPicking}
	<PresetPicker kind='spriteGroup' title='Place prefab' onPick={applyPrefab} onClose={() => (prefabPicking = false)} />
{/if}

<style lang='scss'>
	.objects-panel {
		display: flex;
		flex-direction: column;
		min-height: 0;

		header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 6px 8px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);

			.title {
				font-size: 12px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				opacity: 0.7;
			}
		}

		.list {
			overflow-y: auto;
			padding: 4px;
			display: flex;
			flex-direction: column;
			gap: 2px;
		}

		.row {
			display: grid;
			grid-template-columns: 18px 1fr 26px;
			align-items: center;
			gap: 8px;
			height: 30px;
			padding: 0 6px;
			border: 1px solid transparent;
			border-radius: 4px;
			cursor: grab;

			&:hover {
				background: rgba(255, 255, 255, 0.05);
			}

			&.active {
				background: rgba(255, 144, 0, 0.18);
				border-color: rgba(255, 144, 0, 0.5);
			}

			&.dim {
				opacity: 0.5;
			}

			.name {
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				font-size: 12px;
			}

			.in-state {
				background: none;
				border: 0;
				color: inherit;
				opacity: 0.6;
				cursor: pointer;

				&.on {
					opacity: 1;
					color: #ff9800;
				}
			}
		}

		.empty {
			padding: 14px 4px;
			text-align: center;
			font-size: 11px;
			opacity: 0.5;
		}
	}
</style>
