<svelte:options runes={true} />
<script lang='ts'>
	import type { Snippet } from 'svelte';

	const {
		label,
		hint,
		span2 = false,
		children,
	}: {
		label?: string;
		hint?: string;
		/** Span both columns inside a 2-column field grid. */
		span2?: boolean;
		children: Snippet;
	} = $props();
</script>

<label class='splash-field' class:span2>
	{#if label}<span class='splash-field-label'>{label}</span>{/if}
	{@render children()}
	{#if hint}<span class='splash-field-hint'>{hint}</span>{/if}
</label>

<style lang='scss'>
	.splash-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;

		&.span2 {
			grid-column: span 2;
		}
	}

	.splash-field-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.7;
		font-weight: 500;
	}

	.splash-field-hint {
		font-size: 10px;
		opacity: 0.5;
	}

	// Shared control look, applied by the typed field components.
	:global(.splash-field-input) {
		height: 30px;
		padding: 0 6px;
		width: 100%;
		box-sizing: border-box;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
		border-radius: 3px;
		color: var(--color-text-primary, #e4e4e4);
		font-size: 12px;
		outline: none;

		&:focus {
			border-color: rgba(255, 144, 0, 0.5);
		}
	}
</style>
