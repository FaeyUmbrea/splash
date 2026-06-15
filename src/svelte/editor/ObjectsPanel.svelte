<svelte:options runes={true} />
<script lang='ts'>
	import type { PresetPayload, PresetSummary } from '../../utils/presets.ts';
	import type { ContextMenuItem } from '../ui';
	import type { EditorGroupNode, EditorModel, EditorObject } from './editorModel.svelte.ts';
	import type { SpriteType } from './spriteFactory.ts';
	import { getBehavior } from '../../behaviors/index.ts';
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
	function applyPrefab(payload: PresetPayload, summary: PresetSummary) {
		// A behavior-backed prefab (e.g. the tumbler lock) runs its config dialog + build on apply instead of
		// stamping the baked sprites, so dropping it asks "what's the code word?".
		if (summary.behavior && getBehavior(summary.behavior)) {
			void placeBehavior(summary.behavior);
			return;
		}
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

	// --- groups in the tree --------------------------------------------------

	const collapsed = $state<Record<string, boolean>>({});

	/** The entered group stays expanded so its members are always reachable for editing. */
	function isExpanded(node: EditorGroupNode): boolean {
		return model.activeGroup === node.groupId || !collapsed[node.groupId];
	}

	function selectGroup(node: EditorGroupNode, additive: boolean) {
		const first = node.members[0]?.id;
		if (first) model.select(first, additive);
	}

	function toggleGroupPlacement(event: MouseEvent, node: EditorGroupNode) {
		event.stopPropagation();
		model.setGroupInState(node.groupId, !node.inState);
	}

	function toggleCollapse(event: MouseEvent, groupId: string) {
		event.stopPropagation();
		collapsed[groupId] = !collapsed[groupId];
	}

	async function renameGroup(node: EditorGroupNode) {
		const safe = node.name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c] ?? c));
		const name = await foundry.applications.api.DialogV2.prompt({
			window: { title: 'Rename group' },
			content: `<input type="text" name="name" value="${safe}" style="width:100%" autofocus />`,
			ok: { label: 'Rename', callback: (_event: unknown, button: { form: HTMLFormElement }) => (button.form.elements.namedItem('name') as HTMLInputElement)?.value },
		}).catch(() => null);
		if (name != null) model.renameGroup(node.groupId, String(name));
	}

	function openGroupMenu(event: MouseEvent, node: EditorGroupNode) {
		event.preventDefault();
		event.stopPropagation();
		rowMenu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				model.activeGroup === node.groupId
					? { label: 'Exit group', icon: 'fa-solid fa-arrow-up-from-bracket', action: () => model.exitGroup() }
					: { label: 'Enter group', icon: 'fa-solid fa-arrow-down-to-bracket', action: () => model.enterGroup(node.groupId) },
				{ label: 'Rename', icon: 'fa-solid fa-i-cursor', action: () => renameGroup(node) },
				node.inState
					? { label: `Remove from "${model.activeState}"`, icon: 'fa-solid fa-eye-slash', action: () => model.setGroupInState(node.groupId, false) }
					: { label: `Place in "${model.activeState}"`, icon: 'fa-solid fa-plus', action: () => model.setGroupInState(node.groupId, true) },
				{ label: 'Ungroup', icon: 'fa-solid fa-object-ungroup', action: () => model.ungroupGroup(node.groupId) },
				{ separator: true },
				{ label: 'Delete group', icon: 'fa-solid fa-trash', danger: true, action: () => model.deleteGroup(node.groupId) },
			],
		};
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
		{#each model.objectTree as node (node.kind === 'group' ? `g:${node.groupId}` : node.object.id)}
			{#if node.kind === 'object'}
				{@render objectRow(node.object, false)}
			{:else}
				<div
					class='group-header'
					class:active={node.members.every(m => model.isSelected(m.id))}
					class:entered={model.activeGroup === node.groupId}
					class:dim={!node.inState}
					role='button'
					tabindex='0'
					title='Double-click to edit members individually'
					onclick={e => selectGroup(node, e.shiftKey || e.ctrlKey || e.metaKey)}
					onkeydown={e => (e.key === 'Enter' || e.key === ' ') && selectGroup(node, false)}
					ondblclick={() => model.enterGroup(node.groupId)}
					oncontextmenu={e => openGroupMenu(e, node)}
				>
					<button type='button' class='caret' aria-label='Collapse group' onclick={e => toggleCollapse(e, node.groupId)}>
						<i class={isExpanded(node) ? 'fa-solid fa-caret-down' : 'fa-solid fa-caret-right'}></i>
					</button>
					<i class='fa-solid fa-object-group'></i>
					<span class='name'>{node.name} <span class='count'>({node.members.length})</span></span>
					<button
						type='button'
						class='in-state'
						class:on={node.inState}
						title={node.inState ? 'In this state — click to remove the group' : 'Not in this state — click to add the group'}
						aria-label='Toggle group in state'
						onclick={e => toggleGroupPlacement(e, node)}
					>
						<i class={node.inState ? 'fa-solid fa-eye' : 'fa-regular fa-eye-slash'}></i>
					</button>
				</div>
				{#if isExpanded(node)}
					{#each node.members as m (m.id)}
						{@render objectRow(m, true)}
					{/each}
				{/if}
			{/if}
		{/each}
		{#if model.objectTree.length === 0}
			<div class='empty'>No objects yet — use + to add one.</div>
		{/if}
	</div>
</section>

{#snippet objectRow(obj: EditorObject, indented: boolean)}
	<div
		class='row'
		class:indented
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
{/snippet}

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

			&.indented {
				margin-left: 18px;
			}
		}

		.group-header {
			display: grid;
			grid-template-columns: 16px 16px 1fr 26px;
			align-items: center;
			gap: 6px;
			height: 30px;
			padding: 0 6px;
			border: 1px solid transparent;
			border-radius: 4px;
			cursor: pointer;

			&:hover {
				background: rgba(255, 255, 255, 0.05);
			}

			&.active {
				background: rgba(255, 144, 0, 0.18);
				border-color: rgba(255, 144, 0, 0.5);
			}

			&.entered {
				border-color: rgba(255, 144, 0, 0.7);
				background: rgba(255, 144, 0, 0.08);
			}

			&.dim {
				opacity: 0.5;
			}

			.caret {
				background: none;
				border: 0;
				color: inherit;
				opacity: 0.7;
				cursor: pointer;
				padding: 0;
			}

			.name {
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				font-size: 12px;
				font-weight: 600;

				.count {
					opacity: 0.5;
					font-weight: 400;
				}
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
