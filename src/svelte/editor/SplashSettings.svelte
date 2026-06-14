<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectItem } from '../ui';
	import type { DocumentStore } from './documentStore.svelte.ts';
	import { CheckboxField, NumberField, Panel, Select, TextField } from '../ui';
	import ActionListEditor from './ActionListEditor.svelte';
	import AnimationEditor from './AnimationEditor.svelte';
	import { setField, setFieldReplace, setStates } from './edit.ts';

	const { store, activeState }: { store: DocumentStore; activeState: string } = $props();

	const data = $derived(store.data);
	const page = $derived(store.page);

	const activeStateDef = $derived((data.states?.[activeState] ?? { label: '', onEnter: [] }) as { label?: string; onEnter?: Record<string, unknown>[] });
	const isInitial = $derived((data.initialState ?? []).includes(activeState));

	function patchState(patch: Record<string, unknown>) {
		const states = foundry.utils.deepClone(data.states ?? {}) as Record<string, Record<string, unknown>>;
		states[activeState] = { ...states[activeState], ...patch };
		void setStates(page, states);
	}

	function toggleInitial(on: boolean) {
		const current = (data.initialState ?? []).filter(s => s !== activeState);
		if (on) current.push(activeState);
		void setField(page, 'initialState', current);
	}

	const layerOptions: SelectItem[] = [
		{ value: 'scene', label: 'Scene (above canvas)', icon: 'fa-solid fa-layer-group' },
		{ value: 'hud', label: 'HUD (hides scene chrome)', icon: 'fa-solid fa-table-columns' },
		{ value: 'full', label: 'Full (above all UI)', icon: 'fa-solid fa-expand' },
		{ value: 'handout', label: 'Handout (windowed)', icon: 'fa-solid fa-window-maximize' },
	];
	const modeOptions: SelectItem[] = [
		{ value: 'local', label: 'Local (per client)' },
		{ value: 'synced', label: 'Synced (shared state)' },
	];
	const voteOptions: SelectItem[] = [
		{ value: 'all', label: 'Tallies visible to all' },
		{ value: 'gm', label: 'Tallies GM only' },
	];
	const sceneOptions = $derived(
		(game.scenes?.contents ?? []).map(s => ({ value: s.id as string, label: s.name as string })),
	);

	const isHandout = $derived(data.layer === 'handout');

	function changeLayer(value: string | string[] | null) {
		const layer = value as string;
		// Switching to handout needs a starting size so the window/editor frame isn't empty.
		if (layer === 'handout' && !data.handoutSize) {
			void page.update({ 'system.layer': layer, 'system.handoutSize': { width: 800, height: 600 } });
			return;
		}
		void setField(page, 'layer', layer);
	}
</script>

<Panel title='Splash settings'>
	<div class='splash-settings'>
		<label class='row'>
			<span class='label'>Kind / layer</span>
			<Select options={layerOptions} value={data.layer} onChange={changeLayer} searchable={false} />
		</label>

		<label class='row'>
			<span class='label'>Mode</span>
			<Select options={modeOptions} value={data.mode} onChange={v => setField(page, 'mode', v)} searchable={false} />
		</label>

		<label class='row'>
			<span class='label'>Vote tallies</span>
			<Select options={voteOptions} value={data.voteVisibility} onChange={v => setField(page, 'voteVisibility', v)} searchable={false} />
		</label>

		<CheckboxField label='Global (shown in the scene-control global tab)' value={data.global} onChange={v => setField(page, 'global', v)} />

		<label class='row'>
			<span class='label'>Pinned scenes</span>
			<Select
				options={sceneOptions}
				value={[...(data.scenePins ?? [])]}
				multiple
				placeholder='No scenes pinned'
				onChange={v => setField(page, 'scenePins', v)}
			/>
		</label>

		{#if isHandout}
			<div class='size-grid'>
				<NumberField
					label='Width'
					value={data.handoutSize?.width ?? 800}
					min={100}
					onChange={v => setField(page, 'handoutSize.width', v)}
				/>
				<NumberField
					label='Height'
					value={data.handoutSize?.height ?? 600}
					min={100}
					onChange={v => setField(page, 'handoutSize.height', v)}
				/>
			</div>
		{/if}

		<div class='section'>
			<AnimationEditor label='Splash animation in' value={data.animIn} onChange={a => setFieldReplace(page, 'animIn', a)} />
			<AnimationEditor label='Splash animation out' value={data.animOut} onChange={a => setFieldReplace(page, 'animOut', a)} />
		</div>

		<div class='section'>
			<span class='section-title'>State: {activeState}</span>
			<TextField label='Label' value={activeStateDef.label ?? ''} onChange={v => patchState({ label: v })} />
			<CheckboxField label='Loaded on open (initial state)' value={isInitial} onChange={toggleInitial} />
			<span class='label'>On enter actions</span>
			<ActionListEditor
				actions={activeStateDef.onEnter ?? []}
				states={Object.keys(data.states ?? {})}
				onChange={a => patchState({ onEnter: a })}
			/>
		</div>
	</div>
</Panel>

<style lang='scss'>
	.splash-settings {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
	}

	.section-title {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.75;
	}

	.row {
		display: flex;
		flex-direction: column;
		gap: 4px;

		.label {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.4px;
			opacity: 0.7;
			font-weight: 500;
		}
	}

	.size-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
</style>
