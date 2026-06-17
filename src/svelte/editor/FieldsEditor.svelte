<svelte:options runes={true} />
<script lang='ts'>
	import type { FieldDef, FieldOption } from '../../api/api.ts';
	import type { SelectItem } from '../ui';
	import { CheckboxField, ColorField, NumberField, Select, TextField } from '../ui';
	import ConditionsField from './ConditionsField.svelte';

	const {
		fields,
		value,
		states = [],
		onChange,
	}: {
		fields: FieldDef[];
		/** The object the fields read from and patch into (an effect, an action, or an animation's props). */
		value: Record<string, unknown>;
		/** State keys, for `select` fields with `source: 'states'`. */
		states?: string[];
		onChange: (patch: Record<string, unknown>) => void;
	} = $props();

	const macroOptions = $derived((game.macros?.contents ?? []).map(m => ({ value: m.id as string, label: m.name as string })));
	const stateOptions = $derived(states.map(s => ({ value: s, label: s })));

	function optionsFor(f: FieldDef): SelectItem[] {
		if (f.type !== 'select') return [];
		if (f.source === 'macros') return macroOptions;
		if (f.source === 'states') return stateOptions;
		return (f.options ?? []).map((o: FieldOption) => ({ value: o.value, label: o.label }));
	}

	const set = (key: string, v: unknown) => onChange({ [key]: v });

	// Consecutive fields sharing a `group` render together in one grid row.
	const rows = $derived.by(() => {
		const out: { group?: string; fields: FieldDef[] }[] = [];
		for (const f of fields) {
			const group = 'group' in f ? f.group : undefined;
			const last = out[out.length - 1];
			if (group && last && last.group === group) last.fields.push(f);
			else out.push({ group, fields: [f] });
		}
		return out;
	});
</script>

{#snippet field(f: FieldDef)}
	{#if f.type === 'number'}
		<NumberField label={f.label} step={f.step} value={(value[f.key] as number) ?? null} onChange={v => set(f.key, v)} />
	{:else if f.type === 'text'}
		<TextField label={f.label} value={(value[f.key] as string) ?? ''} onChange={v => set(f.key, v)} />
	{:else if f.type === 'color'}
		<ColorField label={f.label} value={(value[f.key] as string) ?? ''} onChange={v => set(f.key, v)} />
	{:else if f.type === 'checkbox'}
		<CheckboxField label={f.label} value={(value[f.key] as boolean) ?? false} onChange={v => set(f.key, v)} />
	{:else if f.type === 'select'}
		<Select
			options={optionsFor(f)}
			value={f.multiple ? [...((value[f.key] as string[]) ?? [])] : ((value[f.key] as string) ?? null)}
			multiple={f.multiple}
			placeholder={f.placeholder}
			onChange={v => set(f.key, v)}
		/>
	{:else if f.type === 'conditions'}
		<ConditionsField label={game.i18n.localize('splash.editor.actionEditor.conditionsLabel')} value={value[f.key] as Record<string, string> | null} onChange={v => set(f.key, v)} />
	{:else if f.type === 'code'}
		{#if f.hint}<span class='sublabel'>{f.hint}</span>{/if}
		<textarea
			class='code-source'
			spellcheck='false'
			value={(value[f.key] as string) ?? ''}
			oninput={e => set(f.key, (e.currentTarget as HTMLTextAreaElement).value)}
		></textarea>
	{/if}
{/snippet}

<div class='fields'>
	{#each rows as row, ri (ri)}
		{#if row.fields.length > 1}
			<div class='grid' style:grid-template-columns={`repeat(${row.fields.length}, 1fr)`}>
				{#each row.fields as f (f.key)}{@render field(f)}{/each}
			</div>
		{:else}
			{@render field(row.fields[0])}
		{/if}
	{/each}
</div>

<style lang='scss'>
	.fields {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.grid {
		display: grid;
		gap: 6px;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.code-source {
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
</style>
