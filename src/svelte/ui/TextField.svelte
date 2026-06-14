<svelte:options runes={true} />
<script lang='ts'>
	import Field from './Field.svelte';

	let {
		label,
		hint,
		span2 = false,
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		onChange,
	}: {
		label?: string;
		hint?: string;
		span2?: boolean;
		value: string;
		placeholder?: string;
		disabled?: boolean;
		onChange?: (value: string) => void;
	} = $props();
</script>

<Field {label} {hint} {span2}>
	<input
		class='splash-field-input'
		type='text'
		bind:value
		{placeholder}
		{disabled}
		onchange={() => onChange?.(value)}
	/>
</Field>
