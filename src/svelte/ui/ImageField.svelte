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

	function browse() {
		new foundry.applications.apps.FilePicker({
			type: 'image',
			current: value || undefined,
			callback: (path: string) => {
				value = path;
				onChange?.(value);
			},
		}).render(true);
	}
</script>

<Field {label} {hint} {span2}>
	<span class='splash-image-row'>
		<input
			class='splash-field-input'
			type='text'
			bind:value
			{placeholder}
			{disabled}
			onchange={() => onChange?.(value)}
		/>
		<button type='button' class='splash-image-browse' title='Browse files' aria-label='Browse files' {disabled} onclick={browse}>
			<i class='fas fa-folder-open'></i>
		</button>
	</span>
</Field>

<style lang='scss'>
	.splash-image-row {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.splash-image-browse {
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
		border-radius: 3px;
		color: inherit;
		cursor: pointer;

		&:hover {
			border-color: rgba(255, 144, 0, 0.5);
		}
	}
</style>
