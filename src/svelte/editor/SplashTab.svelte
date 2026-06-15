<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectItem } from '../ui';
	import type { EditorModel } from './editorModel.svelte.ts';
	import { CheckboxField, Field, NumberField, Select } from '../ui';
	import AnimationEditor from './AnimationEditor.svelte';

	const { model }: { model: EditorModel } = $props();
	const data = $derived(model.data);

	const layerOptions: SelectItem[] = [
		{ value: 'scene', label: game.i18n.localize('splash.editor.splashTab.layerScene'), icon: 'fa-solid fa-layer-group' },
		{ value: 'hud', label: game.i18n.localize('splash.editor.splashTab.layerHud'), icon: 'fa-solid fa-table-columns' },
		{ value: 'full', label: game.i18n.localize('splash.editor.splashTab.layerFull'), icon: 'fa-solid fa-expand' },
		{ value: 'handout', label: game.i18n.localize('splash.editor.splashTab.layerHandout'), icon: 'fa-solid fa-window-maximize' },
	];
	const modeOptions: SelectItem[] = [
		{ value: 'local', label: game.i18n.localize('splash.editor.splashTab.modeLocal') },
		{ value: 'synced', label: game.i18n.localize('splash.editor.splashTab.modeSynced') },
	];
	const voteOptions: SelectItem[] = [
		{ value: 'all', label: game.i18n.localize('splash.editor.splashTab.voteAll') },
		{ value: 'gm', label: game.i18n.localize('splash.editor.splashTab.voteGm') },
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
	<Field label={game.i18n.localize('splash.editor.splashTab.kindLayer')}>
		<Select options={layerOptions} value={data.layer} onChange={changeLayer} searchable={false} />
	</Field>
	<Field label={game.i18n.localize('splash.editor.splashTab.mode')}>
		<Select options={modeOptions} value={data.mode} onChange={v => model.setField('mode', v)} searchable={false} />
	</Field>
	<Field label={game.i18n.localize('splash.editor.splashTab.voteTallies')}>
		<Select options={voteOptions} value={data.voteVisibility} onChange={v => model.setField('voteVisibility', v)} searchable={false} />
	</Field>

	<CheckboxField label={game.i18n.localize('splash.editor.splashTab.global')} value={data.global} onChange={v => model.setField('global', v)} />

	<Field label={game.i18n.localize('splash.editor.splashTab.pinnedScenes')}>
		<Select options={sceneOptions} value={[...(data.scenePins ?? [])]} multiple placeholder={game.i18n.localize('splash.editor.splashTab.noScenesPinned')} onChange={v => model.setField('scenePins', v)} />
	</Field>

	{#if isHandout}
		<div class='grid'>
			<NumberField label={game.i18n.localize('splash.editor.splashTab.width')} value={data.handoutSize?.width ?? 800} min={100} onChange={v => model.setField('handoutSize.width', v)} />
			<NumberField label={game.i18n.localize('splash.editor.splashTab.height')} value={data.handoutSize?.height ?? 600} min={100} onChange={v => model.setField('handoutSize.height', v)} />
		</div>
	{/if}

	<div class='subsection'>
		<AnimationEditor label={game.i18n.localize('splash.editor.splashTab.animIn')} width={model.stageW} value={data.animIn} onChange={a => model.setField('animIn', a, true)} />
		<AnimationEditor label={game.i18n.localize('splash.editor.splashTab.animOut')} width={model.stageW} value={data.animOut} onChange={a => model.setField('animOut', a, true)} />
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
