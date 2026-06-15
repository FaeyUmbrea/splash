<svelte:options runes={true} />
<script lang='ts'>
	import type { Snippet } from 'svelte';

	const {
		columns = '1fr',
		active = false,
		onclick,
		oncontextmenu,
		children,
	}: {
		/** grid-template-columns value, e.g. '24px 1fr auto'. */
		columns?: string;
		active?: boolean;
		onclick?: (e: MouseEvent) => void;
		oncontextmenu?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const interactive = $derived(!!onclick);

	function onKeyDown(e: KeyboardEvent) {
		if (!onclick) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick(e as unknown as MouseEvent);
		}
	}
</script>

<!-- Can't be a real <button>: the row contains action buttons. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class='splash-list-row'
	class:active
	class:interactive
	style={`grid-template-columns:${columns}`}
	role={interactive ? 'button' : undefined}
	tabindex={interactive ? 0 : undefined}
	onclick={onclick}
	oncontextmenu={oncontextmenu}
	onkeydown={onKeyDown}
>
	{@render children()}
</div>

<style lang='scss'>
	.splash-list-row {
		display: grid;
		align-items: center;
		gap: 8px;
		height: 32px;
		padding: 0 8px;
		border: 1px solid transparent;
		border-radius: 4px;

		&.interactive {
			cursor: pointer;
		}

		&.interactive:hover {
			background: rgba(255, 255, 255, 0.05);
		}

		&.active {
			background: rgba(255, 144, 0, 0.18);
			border-color: rgba(255, 144, 0, 0.5);
		}
	}
</style>
