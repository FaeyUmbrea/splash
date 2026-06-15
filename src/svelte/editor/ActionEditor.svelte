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
		{ value: 'macro', label: 'Run macro', icon: 'fa-solid fa-scroll' },
		{ value: 'change-state', label: 'Change state', icon: 'fa-solid fa-right-left' },
		{ value: 'set-value', label: 'Set value', icon: 'fa-solid fa-equals' },
		{ value: 'increment-value', label: 'Increment value', icon: 'fa-solid fa-plus-minus' },
		{ value: 'vote', label: 'Vote', icon: 'fa-solid fa-check-to-slot' },
		{ value: 'script', label: 'Script (inline macro)', icon: 'fa-solid fa-code' },
		{ value: 'close', label: 'Close splash', icon: 'fa-solid fa-xmark' },
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
	<Select options={typeOptions} value={type} searchable={false} placeholder='No action' onChange={setType} />

	{#if type === 'macro'}
		<Select options={macroOptions} value={(action?.macro as string) ?? null} placeholder='Pick a macro' onChange={v => patch({ macro: v })} />
	{:else if type === 'change-state'}
		<Select options={stateOptions} value={[...((action?.load as string[]) ?? [])]} multiple placeholder='Load states…' onChange={v => patch({ load: v })} />
		<Select options={stateOptions} value={[...((action?.unload as string[]) ?? [])]} multiple placeholder='Unload states…' onChange={v => patch({ unload: v })} />

		<div class='conditions'>
			<span class='sublabel'>Conditions (value gate)</span>
			{#each Object.entries(conditions ?? {}) as [key, value] (key)}
				<div class='cond-row'>
					<span class='cond-key'>{key}</span>
					<TextField value={value} onChange={v => setCondition(key, v)} />
					<IconButton icon='fa-solid fa-trash' title='Remove condition' danger onclick={() => removeCondition(key)} />
				</div>
			{/each}
			<div class='cond-add'>
				<TextField bind:value={newConditionKey} placeholder='value key' />
				<IconButton icon='fa-solid fa-plus' title='Add condition' onclick={addCondition} />
			</div>
		</div>
	{:else if type === 'set-value'}
		<TextField label='Key' value={(action?.key as string) ?? ''} onChange={v => patch({ key: v })} />
		<TextField label='Value' value={(action?.value as string) ?? ''} onChange={v => patch({ value: v })} />
	{:else if type === 'increment-value'}
		<TextField label='Key' value={(action?.key as string) ?? ''} onChange={v => patch({ key: v })} />
		<div class='grid'>
			<NumberField label='Step' value={(action?.step as number) ?? 1} onChange={v => patch({ step: v })} />
			<NumberField label='Min' value={(action?.min as number) ?? null} onChange={v => patch({ min: v })} />
			<NumberField label='Max' value={(action?.max as number) ?? null} onChange={v => patch({ max: v })} />
		</div>
		<CheckboxField label='Wrap min↔max (tumbler digit)' value={(action?.wrap as boolean) ?? false} onChange={v => patch({ wrap: v })} />
	{:else if type === 'vote'}
		<TextField label='Vote option id' value={(action?.optionId as string) ?? ''} onChange={v => patch({ optionId: v })} />
	{:else if type === 'script'}
		<span class='sublabel'>Inline macro — globals: <code>scope</code> (this element's node), <code>context</code> (its data), <code>api</code> (changeState / setValue / close)</span>
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
