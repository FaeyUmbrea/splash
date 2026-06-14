<svelte:options runes={true} />
<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { ContextMenuItem } from '../ui';
	import type { DocumentStore } from './documentStore.svelte.ts';
	import { ContextMenu, Tabs } from '../ui';
	import { setChildren, setField, setStates } from './edit.ts';

	const {
		store,
		activeState,
		onActivate,
	}: {
		store: DocumentStore;
		activeState: string;
		onActivate: (state: string) => void;
	} = $props();

	const data = $derived(store.data);
	const stateMap = $derived((data.states ?? {}) as Record<string, { label?: string; onEnter?: unknown[] }>);
	const tabs = $derived(Object.entries(stateMap).map(([id, s]) => ({ id, label: s.label || id })));

	let menu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	function freshKey(states: Record<string, unknown>) {
		let key = 'state';
		let i = 1;
		while (states[key]) key = `state${i++}`;
		return key;
	}

	function addState() {
		const states = foundry.utils.deepClone(stateMap) as Record<string, unknown>;
		const key = freshKey(states);
		states[key] = { label: key, onEnter: [] };
		void setStates(store.page, states);
		onActivate(key);
	}

	async function renameState(key: string) {
		const label = await foundry.applications.api.DialogV2.prompt({
			window: { title: 'Rename state' },
			content: `<input name="label" type="text" value="${stateMap[key]?.label ?? key}" autofocus style="width:100%">`,
			ok: { callback: (_e: Event, button: HTMLButtonElement) => (button.form?.elements.namedItem('label') as HTMLInputElement)?.value },
		}).catch(() => null);
		if (label == null) return;
		const states = foundry.utils.deepClone(stateMap) as Record<string, { label?: string }>;
		states[key] = { ...states[key], label };
		void setStates(store.page, states);
	}

	function duplicateState(key: string) {
		const states = foundry.utils.deepClone(stateMap) as Record<string, unknown>;
		const newKey = freshKey(states);
		states[newKey] = { ...foundry.utils.deepClone(states[key] as object), label: `${stateMap[key]?.label || key} copy` };
		void setStates(store.page, states);
		// Copy every sprite's placement for the source state into the new state.
		const children = foundry.utils.deepClone(data.children ?? []) as SpriteCreate[];
		let touched = false;
		for (const sprite of children) {
			const placement = sprite.states?.[key];
			if (placement) {
				(sprite.states as Record<string, unknown>)[newKey] = foundry.utils.deepClone(placement);
				touched = true;
			}
		}
		if (touched) void setChildren(store.page, children);
		onActivate(newKey);
	}

	function deleteState(key: string) {
		const keys = Object.keys(stateMap);
		if (keys.length <= 1) {
			ui.notifications?.warn('Splash | A splash needs at least one state.');
			return;
		}
		const states = foundry.utils.deepClone(stateMap) as Record<string, unknown>;
		delete states[key];
		void setStates(store.page, states);
		// Remove the placement for this state from every sprite.
		const children = foundry.utils.deepClone(data.children ?? []) as SpriteCreate[];
		let touched = false;
		for (const sprite of children) {
			if (sprite.states?.[key]) {
				delete (sprite.states as Record<string, unknown>)[key];
				touched = true;
			}
		}
		if (touched) void setChildren(store.page, children);
		// Drop it from the initial-state list.
		const initial = (data.initialState ?? []).filter(s => s !== key);
		void setField(store.page, 'initialState', initial);
		if (activeState === key) onActivate(Object.keys(states)[0]);
	}

	function tabMenu(id: string, event: MouseEvent) {
		event.preventDefault();
		menu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				{ label: 'Rename', icon: 'fa-solid fa-pen', action: () => void renameState(id) },
				{ label: 'Duplicate', icon: 'fa-solid fa-clone', action: () => duplicateState(id) },
				{ label: 'Set as sole initial state', icon: 'fa-solid fa-flag', action: () => void setField(store.page, 'initialState', [id]) },
				{ separator: true },
				{ label: 'Delete', icon: 'fa-solid fa-trash', danger: true, action: () => deleteState(id) },
			],
		};
	}
</script>

<div class='state-tabs'>
	<Tabs {tabs} value={activeState} onChange={onActivate} onContext={tabMenu} />
	<button type='button' class='add-state' title='Add state' aria-label='Add state' onclick={addState}>
		<i class='fa-solid fa-plus'></i>
	</button>
</div>

{#if menu}
	<ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => (menu = null)} />
{/if}

<style lang='scss'>
	.state-tabs {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 0;
	}

	.add-state {
		flex: 0 0 auto;
		width: 30px;
		height: 30px;
		background: transparent;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
		border-radius: 3px;
		color: inherit;
		opacity: 0.75;
		cursor: pointer;

		&:hover {
			opacity: 1;
			border-color: rgba(255, 144, 0, 0.5);
		}
	}
</style>
