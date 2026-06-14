<svelte:options runes={true} />
<script lang='ts'>
	const {
		icon,
		title,
		onclick,
		disabled = false,
		danger = false,
		active = false,
	}: {
		icon: string;
		title: string;
		onclick?: (e: MouseEvent) => void;
		disabled?: boolean;
		danger?: boolean;
		active?: boolean;
	} = $props();
</script>

<button
	type='button'
	class='splash-icon-button'
	class:danger
	class:active
	{title}
	aria-label={title}
	{disabled}
	onclick={onclick}
>
	<i class={icon}></i>
</button>

<style lang='scss'>
	.splash-icon-button {
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
		border-radius: 3px;
		color: inherit;
		opacity: 0.75;
		cursor: pointer;
		font-size: 12px;

		&:hover:not(:disabled) {
			opacity: 1;
			border-color: rgba(255, 144, 0, 0.5);
		}

		&.active {
			opacity: 1;
			background: rgba(255, 144, 0, 0.18);
			border-color: rgba(255, 144, 0, 0.5);
		}

		&.danger:hover:not(:disabled) {
			border-color: rgba(220, 60, 60, 0.6);
			background: rgba(220, 60, 60, 0.15);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	}
</style>
