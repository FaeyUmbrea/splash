<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectItem } from '../ui';
	import { SplashAPI } from '../../api/api.ts';
	import { IconButton, Select } from '../ui';
	import FieldsEditor from './FieldsEditor.svelte';

	type Effect = Record<string, unknown> & { type?: string };

	const {
		effects,
		onChange,
	}: {
		effects: Effect[];
		onChange: (effects: Effect[]) => void;
	} = $props();

	const api = SplashAPI.getInstance();
	const types = $derived(api.registeredEffects);
	const typeOptions = $derived<SelectItem[]>(types.map(t => ({ value: t.type, label: t.name })));
	const metaFor = (type?: string) => types.find(t => t.type === type);

	function create(type: string): Effect {
		return { type, ...(metaFor(type)?.defaults ?? {}) };
	}
	function add() {
		const first = types[0];
		if (first) onChange([...effects, create(first.type)]);
	}
	function remove(index: number) {
		onChange(effects.filter((_, i) => i !== index));
	}
	function setType(index: number, type: string) {
		onChange(effects.map((e, i) => (i === index ? create(type) : e)));
	}
	function patch(index: number, p: Record<string, unknown>) {
		onChange(effects.map((e, i) => (i === index ? { ...e, ...p } : e)));
	}
</script>

<div class='effects'>
	<div class='head'>
		<span class='sublabel'>{game.i18n.localize('splash.editor.effectsEditor.heading')}</span>
		<IconButton icon='fa-solid fa-plus' title={game.i18n.localize('splash.editor.effectsEditor.addEffect')} onclick={add} />
	</div>
	{#each effects as effect, i (i)}
		<div class='effect'>
			<div class='effect-head'>
				<Select options={typeOptions} value={effect.type ?? ''} searchable={false} onChange={t => setType(i, t as string)} />
				<IconButton icon='fa-solid fa-trash' title={game.i18n.localize('splash.editor.effectsEditor.removeEffect')} danger onclick={() => remove(i)} />
			</div>
			<FieldsEditor fields={metaFor(effect.type)?.fields ?? []} value={effect} onChange={p => patch(i, p)} />
		</div>
	{/each}
</div>

<style lang='scss'>
	.effects {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.effect {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		border-radius: 4px;

		.effect-head {
			display: grid;
			grid-template-columns: 1fr auto;
			align-items: center;
			gap: 6px;
		}
	}
</style>
