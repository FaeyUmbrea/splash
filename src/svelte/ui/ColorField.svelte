<svelte:options runes={true} />
<script lang='ts'>
	import Field from './Field.svelte';

	let {
		label,
		hint,
		span2 = false,
		value = $bindable('#000000'),
		disabled = false,
		onChange,
	}: {
		label?: string;
		hint?: string;
		span2?: boolean;
		value: string;
		disabled?: boolean;
		onChange?: (value: string) => void;
	} = $props();

	function commit() {
		onChange?.(value);
	}
</script>

<Field {label} {hint} {span2}>
	<span class='splash-color-row'>
		<input
			class='splash-color-swatch'
			type='color'
			bind:value
			{disabled}
			onchange={commit}
		/>
		<input
			class='splash-field-input'
			type='text'
			bind:value
			{disabled}
			onchange={commit}
		/>
	</span>
</Field>

<style lang='scss'>
	.splash-color-row {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.splash-color-swatch {
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		padding: 0;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.3);
		cursor: pointer;
	}
</style>
