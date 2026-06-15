<svelte:options runes={true} />
<script lang='ts'>
	import type { EditorModel } from './editorModel.svelte.ts';
	import { CheckboxField, TextField } from '../ui';
	import ActionListEditor from './ActionListEditor.svelte';

	const { model }: { model: EditorModel } = $props();

	const def = $derived(model.activeStateDef);
	const isInitial = $derived(model.states.find(s => s.key === model.activeState)?.isInitial ?? false);
	const states = $derived(model.states.map(s => s.key));
</script>

<div class='state-tab'>
	<TextField label={game.i18n.localize('splash.editor.stateTab.stateLabel')} value={def.label ?? ''} onChange={v => model.renameState(model.activeState, v)} />
	<CheckboxField label={game.i18n.localize('splash.editor.stateTab.initialState')} value={isInitial} onChange={v => model.toggleInitial(model.activeState, v)} />

	<div class='subsection'>
		<span class='sublabel'>{game.i18n.localize('splash.editor.stateTab.onEnter')}</span>
		<ActionListEditor actions={(def.onEnter as Record<string, unknown>[]) ?? []} {states} onChange={a => model.setStateOnEnter(a)} />
	</div>
</div>

<style lang='scss'>
	.state-tab {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.subsection {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}
</style>
