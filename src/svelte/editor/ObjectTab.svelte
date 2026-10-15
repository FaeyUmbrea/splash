<svelte:options runes={true} />
<script lang='ts'>
	import type { Tab } from '../ui';
	import type { EditorModel } from './editorModel.svelte.ts';
	import { Tabs, TextField } from '../ui';
	import ObjectAppearance from './ObjectAppearance.svelte';
	import ObjectBehaviour from './ObjectBehaviour.svelte';
	import ObjectPlacement from './ObjectPlacement.svelte';
	import ObjectPresets from './ObjectPresets.svelte';

	const { model }: { model: EditorModel } = $props();
	const obj = $derived(model.selected);
	const states = $derived(model.states.map(s => s.key));
	const stateLabel = $derived(model.states.find(s => s.key === model.activeState)?.label ?? model.activeState);
	let section = $state('appearance');
	const sections: Tab[] = [
		{ id: 'appearance', label: game.i18n.localize('splash.editor.inspector.appearance') },
		{ id: 'placement', label: game.i18n.localize('splash.editor.inspector.placement') },
		{ id: 'behaviour', label: game.i18n.localize('splash.editor.inspector.behaviour') },
	];
</script>

{#if model.selectedIds.length > 1}
	<div class='empty'>{game.i18n.format('splash.editor.objectTab.multiSelected', { count: model.selectedIds.length })}</div>
{:else if !obj}
	<div class='empty'>{game.i18n.localize('splash.editor.inspector.selectObject')}</div>
{:else}
	<div class='object-tab'>
		<TextField label={game.i18n.localize('splash.editor.objectTab.name')} value={obj.raw.name ?? ''} placeholder={obj.name} onChange={v => model.setObjectContent(obj.id, { name: v })} />
		<Tabs tabs={sections} bind:value={section} />
		{#key obj.id}
			{#if section === 'appearance'}
				<ObjectAppearance sprite={obj.raw} stageWidth={model.stageW} onChange={patch => model.setObjectContent(obj.id, patch)} onReplace={(key, value) => model.replaceObjectField(obj.id, key, value)} />
				<ObjectPresets sprite={obj.raw} name={obj.name} onSprite={sprite => model.applySpritePreset(sprite)} onButton={payload => model.applyButtonPreset(obj.id, payload)} />
			{:else if section === 'placement'}
				<ObjectPlacement placement={obj.placement} {stateLabel} stageWidth={model.stageW} onChange={patch => model.setPlacement(obj.id, patch)} onReplace={(key, value) => model.replacePlacementField(obj.id, key, value)} onPlace={() => model.placeInState(obj.id)} />
			{:else}
				<ObjectBehaviour sprite={obj.raw} {states} valueKeys={model.valueKeys} stateLabels={model.stateLabels} onChange={patch => model.setObjectContent(obj.id, patch)} onReplace={(key, value) => model.replaceObjectField(obj.id, key, value)} />
			{/if}
		{/key}
	</div>
{/if}

<style lang='scss'>
	.object-tab {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.empty {
		padding: 24px 12px;
		color: #bbb;
		line-height: 1.6;
		font-size: 13px;
	}
</style>
