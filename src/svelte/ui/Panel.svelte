<svelte:options runes={true} />
<script lang='ts'>
	import type { Snippet } from 'svelte';

	const {
		title,
		actions,
		children,
	}: {
		title?: string;
		/** Optional header-right content (e.g. an add button). */
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class='splash-panel'>
	{#if title || actions}
		<header class='splash-panel-header'>
			{#if title}<span class='splash-panel-title'>{title}</span>{/if}
			{#if actions}<span class='splash-panel-actions'>{@render actions()}</span>{/if}
		</header>
	{/if}
	<div class='splash-panel-body'>
		{@render children()}
	</div>
</section>

<style lang='scss'>
	.splash-panel {
		display: flex;
		flex-direction: column;
		background: rgba(0, 0, 0, 0.15);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
		border-radius: 4px;
		overflow: hidden;
		min-height: 0;
	}

	.splash-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 8px;
		border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
	}

	.splash-panel-title {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		opacity: 0.7;
	}

	.splash-panel-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.splash-panel-body {
		padding: 8px;
		overflow-y: auto;
		min-height: 0;
	}
</style>
