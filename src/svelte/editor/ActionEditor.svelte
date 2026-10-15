<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectItem } from '../ui';
	import { SplashAPI } from '../../api/api.ts';
	import { Select } from '../ui';
	import { actionProblems } from './actionValidation.ts';
	import FieldsEditor from './FieldsEditor.svelte';

	/** Registry-defined action being configured by this editor. */
	type Action = Record<string, unknown> & { type?: string };

	const {
		action,
		states,
		valueKeys = [],
		stateLabels = {},
		onChange,
	}: {
		action: Action | null | undefined;
		/** State keys, for change-state load/unload pickers. */
		states: string[];
		valueKeys?: string[];
		stateLabels?: Record<string, string>;
		onChange: (action: Action) => void;
	} = $props();

	const api = SplashAPI.getInstance();
	const types = $derived(api.registeredActions);
	let advanced = $state(false);
	const typeOptions = $derived<SelectItem[]>(types
		.filter(entry => advanced || entry.type === action?.type || (entry.type !== 'script' && entry.type !== 'macro'))
		.map(entry => ({ value: entry.type, label: entry.name, icon: entry.icon })));
	const metaFor = (type?: string) => types.find(t => t.type === type);

	const problems = $derived(actionProblems(action, states));
	const type = $derived(action?.type ?? '');

	/** Select a registered action and initialise its declared defaults. */
	function setType(value: string | string[] | null) {
		const t = value as string;
		onChange(({ type: t, ...(metaFor(t)?.defaults ?? {}) }) as Action);
	}
	/** Merge one field change into the current action. */
	function patch(p: Record<string, unknown>) {
		onChange({ ...action, ...p } as Action);
	}
</script>

<div class='action-editor'>
	<Select options={typeOptions} value={type} searchable={false} placeholder={game.i18n.localize('splash.editor.actionEditor.noAction')} onChange={setType} />
	{#if type}
		<FieldsEditor fields={metaFor(type)?.fields ?? []} value={action ?? {}} {states} {valueKeys} {stateLabels} onChange={patch} />
	{/if}
	<button type='button' class='advanced' aria-pressed={advanced} onclick={() => (advanced = !advanced)}>{game.i18n.localize(advanced ? 'splash.editor.inspector.hideAdvancedActions' : 'splash.editor.inspector.showAdvancedActions')}</button>
	{#each problems as problem, index (index)}
		<p class='problem' role='status'>{game.i18n.format(`splash.editor.validation.${problem.message}`, { state: problem.state ?? '' })}</p>
	{/each}
</div>

<style lang='scss'>
	.advanced {
		width: auto;
		align-self: flex-start;
		padding: 4px 0;
		height: auto;
		background: none;
		border: 0;
		color: #bbb;
		font-size: 11px;
		cursor: pointer;
	}
	.problem {
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		color: #ffca7a;
	}
	.action-editor {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
