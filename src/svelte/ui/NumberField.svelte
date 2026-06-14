<svelte:options runes={true} />
<script lang='ts'>
	import Field from './Field.svelte';

	let {
		label,
		hint,
		span2 = false,
		value = $bindable(null),
		placeholder = '',
		min,
		max,
		step,
		disabled = false,
		onChange,
	}: {
		label?: string;
		hint?: string;
		span2?: boolean;
		value: number | null;
		placeholder?: string;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		onChange?: (value: number | null) => void;
	} = $props();
</script>

<Field {label} {hint} {span2}>
	<input
		class='splash-field-input'
		type='number'
		bind:value
		{placeholder}
		{min}
		{max}
		{step}
		{disabled}
		onchange={() => onChange?.(value)}
	/>
</Field>
