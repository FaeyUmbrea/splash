<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectItem } from '../ui';
	import type { EditorModel } from './editorModel.svelte.ts';
	import { CheckboxField, Field, NumberField, Select } from '../ui';
	import AnimationEditor from './AnimationEditor.svelte';

	const { model }: { model: EditorModel } = $props();
	const data = $derived(model.data);

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
	const sceneOptions = $derived((game.scenes?.contents ?? []).map(s => ({ value: s.id as string, label: s.name as string })));

	const isHandout = $derived(data.layer === 'handout');

	function changeLayer(value: string | string[] | null) {
		const layer = value as string;
		if (layer === 'handout' && !data.handoutSize) {
			model.setFields({ layer, handoutSize: { width: 800, height: 600 } });
			return;
		}
		model.setField('layer', layer);
	}
</script>

<div class='splash-tab'>
	<Field label='Kind / layer'>
		<Select options={layerOptions} value={data.layer} onChange={changeLayer} searchable={false} />
	</Field>
	<Field label='Mode'>
		<Select options={modeOptions} value={data.mode} onChange={v => model.setField('mode', v)} searchable={false} />
	</Field>
	<Field label='Vote tallies'>
		<Select options={voteOptions} value={data.voteVisibility} onChange={v => model.setField('voteVisibility', v)} searchable={false} />
	</Field>

	<CheckboxField label='Global (scene-control global tab)' value={data.global} onChange={v => model.setField('global', v)} />

	<Field label='Pinned scenes'>
		<Select options={sceneOptions} value={[...(data.scenePins ?? [])]} multiple placeholder='No scenes pinned' onChange={v => model.setField('scenePins', v)} />
	</Field>

	{#if isHandout}
		<div class='grid'>
			<NumberField label='Width' value={data.handoutSize?.width ?? 800} min={100} onChange={v => model.setField('handoutSize.width', v)} />
			<NumberField label='Height' value={data.handoutSize?.height ?? 600} min={100} onChange={v => model.setField('handoutSize.height', v)} />
		</div>
	{/if}

	<div class='subsection'>
		<AnimationEditor label='Splash animation in' width={model.stageW} value={data.animIn} onChange={a => model.setField('animIn', a, true)} />
		<AnimationEditor label='Splash animation out' width={model.stageW} value={data.animOut} onChange={a => model.setField('animOut', a, true)} />
	</div>
</div>

<style lang='scss'>
	.splash-tab {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.subsection {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
