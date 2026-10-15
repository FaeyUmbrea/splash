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
		suggestions = [],
		onChange,
	}: {
		label?: string;
		hint?: string;
		span2?: boolean;
		value: string;
		placeholder?: string;
		disabled?: boolean;
		/** Existing values offered without preventing a new value from being typed. */
		suggestions?: string[];
		onChange?: (value: string) => void;
	} = $props();
	const listId = $props.id();
</script>

<Field {label} {hint} {span2}>
	<input
		class='splash-field-input'
		type='text'
		list={suggestions.length ? listId : undefined}
		bind:value
		{placeholder}
		{disabled}
		onchange={() => onChange?.(value)}
	/>
	{#if suggestions.length}
		<datalist id={listId}>
			{#each suggestions as suggestion (suggestion)}<option value={suggestion}></option>{/each}
		</datalist>
	{/if}
</Field>
