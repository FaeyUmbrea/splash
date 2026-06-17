<svelte:options runes={true} />
<script lang='ts'>
	import { IconButton, TextField } from '../ui';

	const {
		value,
		label,
		onChange,
	}: {
		value: Record<string, string> | null | undefined;
		label: string;
		/** Replace the whole conditions map, or null when it empties. */
		onChange: (conditions: Record<string, string> | null) => void;
	} = $props();

	const conditions = $derived(value ?? {});

	function setCondition(key: string, v: string) {
		onChange({ ...conditions, [key]: v });
	}
	function removeCondition(key: string) {
		const next = { ...conditions };
		delete next[key];
		onChange(Object.keys(next).length ? next : null);
	}
	let newKey = $state('');
	function addCondition() {
		const key = newKey.trim();
		if (!key) return;
		setCondition(key, '');
		newKey = '';
	}
</script>

<div class='conditions'>
	<span class='sublabel'>{label}</span>
	{#each Object.entries(conditions) as [key, v] (key)}
		<div class='cond-row'>
			<span class='cond-key'>{key}</span>
			<TextField value={v} onChange={nv => setCondition(key, nv)} />
			<IconButton icon='fa-solid fa-trash' title={game.i18n.localize('splash.editor.actionEditor.removeCondition')} danger onclick={() => removeCondition(key)} />
		</div>
	{/each}
	<div class='cond-add'>
		<TextField bind:value={newKey} placeholder={game.i18n.localize('splash.editor.actionEditor.valueKey')} />
		<IconButton icon='fa-solid fa-plus' title={game.i18n.localize('splash.editor.actionEditor.addCondition')} onclick={addCondition} />
	</div>
</div>

<style lang='scss'>
	.conditions {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

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
</style>
