<svelte:options runes={true} />
<script lang='ts'>
	let {
		label,
		value = $bindable(false),
		disabled = false,
		onChange,
	}: {
		label: string;
		value: boolean;
		disabled?: boolean;
		onChange?: (value: boolean) => void;
	} = $props();
</script>

<label class='splash-checkbox'>
	<input
		type='checkbox'
		bind:checked={value}
		{disabled}
		onchange={() => onChange?.(value)}
	/>
	<span>{label}</span>
</label>

<style lang='scss'>
	.splash-checkbox {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		cursor: pointer;
		user-select: none;

		input {
			margin: 0;
			flex-shrink: 0;
		}
	}
</style>
