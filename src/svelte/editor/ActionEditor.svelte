<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectItem } from '../ui';
	import { CheckboxField, IconButton, NumberField, Select, TextField } from '../ui';

	type Action = Record<string, unknown> & { type?: string };

	const {
		action,
		states,
		onChange,
	}: {
		action: Action | null | undefined;
		/** State keys, for change-state load/unload pickers. */
		states: string[];
		onChange: (action: Action) => void;
	} = $props();

	const typeOptions: SelectItem[] = [
		{ value: 'macro', label: game.i18n.localize('splash.editor.actionEditor.typeMacro'), icon: 'fa-solid fa-scroll' },
		{ value: 'change-state', label: game.i18n.localize('splash.editor.actionEditor.typeChangeState'), icon: 'fa-solid fa-right-left' },
		{ value: 'set-value', label: game.i18n.localize('splash.editor.actionEditor.typeSetValue'), icon: 'fa-solid fa-equals' },
		{ value: 'increment-value', label: game.i18n.localize('splash.editor.actionEditor.typeIncrementValue'), icon: 'fa-solid fa-plus-minus' },
		{ value: 'vote', label: game.i18n.localize('splash.editor.actionEditor.typeVote'), icon: 'fa-solid fa-check-to-slot' },
		{ value: 'script', label: game.i18n.localize('splash.editor.actionEditor.typeScript'), icon: 'fa-solid fa-code' },
		{ value: 'close', label: game.i18n.localize('splash.editor.actionEditor.typeClose'), icon: 'fa-solid fa-xmark' },
	];

	const macroOptions = $derived(
		(game.macros?.contents ?? []).map(m => ({ value: m.id as string, label: m.name as string })),
	);
	const stateOptions = $derived(states.map(s => ({ value: s, label: s })));

	const type = $derived(action?.type ?? '');
	const conditions = $derived((action?.conditions as Record<string, string> | null) ?? null);

	const DEFAULTS: Record<string, Action> = {
		'macro': { type: 'macro', macro: null },
		'change-state': { type: 'change-state', load: [], unload: [], conditions: null },
		'set-value': { type: 'set-value', key: '', value: '' },
		'increment-value': { type: 'increment-value', key: '', step: 1, min: null, max: null, wrap: false },
		'vote': { type: 'vote', optionId: '' },
		'script': { type: 'script', source: '' },
		'close': { type: 'close' },
	};

	function setType(value: string | string[] | null) {
		onChange(DEFAULTS[value as string] ?? { type: value as string });
	}
	function patch(p: Partial<Action>) {
		onChange({ ...action, ...p } as Action);
	}

	function setCondition(key: string, value: string) {
		patch({ conditions: { ...(conditions ?? {}), [key]: value } });
	}
	function removeCondition(key: string) {
		const next = { ...(conditions ?? {}) };
		delete next[key];
		patch({ conditions: Object.keys(next).length ? next : null });
	}
	let newConditionKey = $state('');
	function addCondition() {
		const key = newConditionKey.trim();
		if (!key) return;
		setCondition(key, '');
		newConditionKey = '';
	}
</script>

<div class='action-editor'>
	<Select options={typeOptions} value={type} searchable={false} placeholder={game.i18n.localize('splash.editor.actionEditor.noAction')} onChange={setType} />

	{#if type === 'macro'}
		<Select options={macroOptions} value={(action?.macro as string) ?? null} placeholder={game.i18n.localize('splash.editor.actionEditor.pickMacro')} onChange={v => patch({ macro: v })} />
	{:else if type === 'change-state'}
		<Select options={stateOptions} value={[...((action?.load as string[]) ?? [])]} multiple placeholder={game.i18n.localize('splash.editor.actionEditor.loadStates')} onChange={v => patch({ load: v })} />
		<Select options={stateOptions} value={[...((action?.unload as string[]) ?? [])]} multiple placeholder={game.i18n.localize('splash.editor.actionEditor.unloadStates')} onChange={v => patch({ unload: v })} />

		<div class='conditions'>
			<span class='sublabel'>{game.i18n.localize('splash.editor.actionEditor.conditionsLabel')}</span>
			{#each Object.entries(conditions ?? {}) as [key, value] (key)}
				<div class='cond-row'>
					<span class='cond-key'>{key}</span>
					<TextField value={value} onChange={v => setCondition(key, v)} />
					<IconButton icon='fa-solid fa-trash' title={game.i18n.localize('splash.editor.actionEditor.removeCondition')} danger onclick={() => removeCondition(key)} />
				</div>
			{/each}
			<div class='cond-add'>
				<TextField bind:value={newConditionKey} placeholder={game.i18n.localize('splash.editor.actionEditor.valueKey')} />
				<IconButton icon='fa-solid fa-plus' title={game.i18n.localize('splash.editor.actionEditor.addCondition')} onclick={addCondition} />
			</div>
		</div>
	{:else if type === 'set-value'}
		<TextField label={game.i18n.localize('splash.editor.actionEditor.key')} value={(action?.key as string) ?? ''} onChange={v => patch({ key: v })} />
		<TextField label={game.i18n.localize('splash.editor.actionEditor.value')} value={(action?.value as string) ?? ''} onChange={v => patch({ value: v })} />
	{:else if type === 'increment-value'}
		<TextField label={game.i18n.localize('splash.editor.actionEditor.key')} value={(action?.key as string) ?? ''} onChange={v => patch({ key: v })} />
		<div class='grid'>
			<NumberField label={game.i18n.localize('splash.editor.actionEditor.step')} value={(action?.step as number) ?? 1} onChange={v => patch({ step: v })} />
			<NumberField label={game.i18n.localize('splash.editor.actionEditor.min')} value={(action?.min as number) ?? null} onChange={v => patch({ min: v })} />
			<NumberField label={game.i18n.localize('splash.editor.actionEditor.max')} value={(action?.max as number) ?? null} onChange={v => patch({ max: v })} />
		</div>
		<CheckboxField label={game.i18n.localize('splash.editor.actionEditor.wrap')} value={(action?.wrap as boolean) ?? false} onChange={v => patch({ wrap: v })} />
	{:else if type === 'vote'}
		<TextField label={game.i18n.localize('splash.editor.actionEditor.voteOptionId')} value={(action?.optionId as string) ?? ''} onChange={v => patch({ optionId: v })} />
	{:else if type === 'script'}
		<span class='sublabel'>{game.i18n.localize('splash.editor.actionEditor.scriptGlobals')}: <code>scope</code> {game.i18n.localize('splash.editor.actionEditor.scriptScope')}, <code>context</code> {game.i18n.localize('splash.editor.actionEditor.scriptContext')}, <code>api</code> {game.i18n.localize('splash.editor.actionEditor.scriptApi')}</span>
		<textarea
			class='script-source'
			spellcheck='false'
			value={(action?.source as string) ?? ''}
			oninput={e => patch({ source: (e.currentTarget as HTMLTextAreaElement).value })}
		></textarea>
	{/if}
</div>

<style lang='scss'>
	.action-editor {
		display: flex;
		flex-direction: column;
		gap: 8px;

		> .sublabel {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.4px;
			opacity: 0.6;

			code {
				text-transform: none;
				opacity: 0.9;
			}
		}
	}

	.script-source {
		min-height: 120px;
		resize: vertical;
		padding: 6px 8px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		color: inherit;
		font-family: monospace;
		font-size: 12px;
		line-height: 1.4;
		white-space: pre;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 6px;
	}

	.conditions {
		display: flex;
		flex-direction: column;
		gap: 6px;

		.sublabel {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.4px;
			opacity: 0.6;
		}

		.cond-row {
			display: grid;
			grid-template-columns: auto 1fr 30px;
			align-items: center;
			gap: 6px;
		}

		.cond-key {
			font-size: 12px;
			opacity: 0.8;
		}

		.cond-add {
			display: grid;
			grid-template-columns: 1fr 30px;
			gap: 6px;
		}
	}
</style>
