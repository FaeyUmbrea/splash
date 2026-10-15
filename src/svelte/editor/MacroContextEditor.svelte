<svelte:options runes={true} />
<script lang='ts'>
	import { TextField } from '../ui';

	const { value, onChange }: {
		value: Record<string, unknown>;
		onChange: (value: Record<string, unknown>) => void;
	} = $props();
	const ctxData = $derived(value);
	let newContextKey = $state('');
	/** Parse a typed value from text: JSON where possible (numbers, arrays, booleans), else a raw string. */
	function parseContext(raw: string): unknown {
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}
	/** Display a context value for editing without losing structured values. */
	function displayContext(value: unknown): string {
		return typeof value === 'string' ? value : JSON.stringify(value);
	}
	/** Replace one macro context entry. */
	function setContext(key: string, value: unknown) {
		onChange({ ...ctxData, [key]: value });
	}
	/** Remove one macro context entry. */
	function removeContext(key: string) {
		const next = { ...ctxData };
		delete next[key];
		onChange(next);
	}
	/** Add a named context entry and clear the entry field. */
	function addContext() {
		const key = newContextKey.trim();
		if (!key) return;
		setContext(key, '');
		newContextKey = '';
	}
</script>
<div class='subsection'>
	<span class='sublabel'>{game.i18n.localize('splash.editor.objectTab.macroContext')}</span>
	{#each Object.entries(ctxData) as [key, value] (key)}
		<div class='ctx-row'>
			<span class='ctx-key' title={key}>{key}</span>
			<TextField value={displayContext(value)} onChange={v => setContext(key, parseContext(v))} />
			<button type='button' class='x' title={game.i18n.localize('splash.editor.objectTab.remove')} aria-label={game.i18n.localize('splash.editor.objectTab.remove')} onclick={() => removeContext(key)}><i class='fa-solid fa-trash'></i></button>
		</div>
	{/each}
	<div class='ctx-add'>
		<TextField bind:value={newContextKey} placeholder={game.i18n.localize('splash.editor.objectTab.contextKey')} />
		<button type='button' class='x' title={game.i18n.localize('splash.editor.objectTab.add')} aria-label={game.i18n.localize('splash.editor.objectTab.add')} onclick={addContext}><i class='fa-solid fa-plus'></i></button>
	</div>
</div>

<style lang='scss'>
	.subsection {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 12px;
	}
	.sublabel {
		font-size: 12px;
		color: #bbb;
	}
	.ctx-row {
		display: grid;
		grid-template-columns: 70px 1fr 30px;
		align-items: center;
		gap: 6px;
	}
	.ctx-key {
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 12px;
	}
	.ctx-add {
		display: grid;
		grid-template-columns: 1fr 30px;
		gap: 6px;
	}
	.x {
		color: inherit;
		background: transparent;
		border: 1px solid #ffffff26;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
