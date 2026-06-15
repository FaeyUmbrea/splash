<svelte:options runes={true} />
<script lang='ts'>
	import type { ContextMenuItem } from './types';
	import { portal } from './select/portal';
	import { isSeparator } from './types';

	const {
		x,
		y,
		items,
		onClose,
	}: {
		x: number;
		y: number;
		items: ContextMenuItem[];
		onClose: () => void;
	} = $props();

	let menuEl = $state<HTMLElement | null>(null);
	// Starts hidden so the clamp can run before the first visible paint.
	let style = $state('visibility:hidden;top:0;left:0;');

	$effect(() => {
		if (!menuEl) return;
		const r = menuEl.getBoundingClientRect();
		let left = x;
		let top = y;
		if (left + r.width > window.innerWidth) left = Math.max(4, window.innerWidth - r.width - 4);
		if (top + r.height > window.innerHeight) top = Math.max(4, window.innerHeight - r.height - 4);
		style = `visibility:visible;top:${Math.round(top)}px;left:${Math.round(left)}px;`;
	});

	function choose(item: ContextMenuItem) {
		if (isSeparator(item) || item.disabled) return;
		onClose();
		item.action();
	}

	function onBackdropContext(e: MouseEvent) {
		e.preventDefault();
		onClose();
	}

	function onWindowKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onWindowKeyDown} onresize={onClose} onscroll={onClose} />

<div class='splash-context-backdrop' use:portal role='presentation' onclick={onClose} oncontextmenu={onBackdropContext}></div>

<div class='splash-context-menu' bind:this={menuEl} use:portal {style} role='menu'>
	{#each items as item, i (i)}
		{#if isSeparator(item)}
			<div class='splash-context-sep' role='separator'></div>
		{:else}
			<button
				type='button'
				class='splash-context-item'
				class:danger={item.danger}
				role='menuitem'
				disabled={item.disabled}
				onclick={() => choose(item)}
			>
				{#if item.icon}<i class={item.icon}></i>{/if}
				<span>{item.label}</span>
			</button>
		{/if}
	{/each}
</div>

<style lang='scss'>
	:global(.splash-context-backdrop) {
		position: fixed;
		inset: 0;
		z-index: 10000;
	}

	:global(.splash-context-menu) {
		position: fixed;
		z-index: 10001;
		min-width: 180px;
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: var(--color-cool-5b, #2a2a2a);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
		border-radius: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
		color: var(--color-text-primary, inherit);
		font-size: 13px;
	}

	:global(.splash-context-item) {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		background: transparent;
		border: 0;
		border-radius: 3px;
		color: inherit;
		text-align: left;
		cursor: pointer;

		i {
			width: 14px;
			text-align: center;
			opacity: 0.8;
		}

		&:hover:not(:disabled) {
			background: rgba(255, 144, 0, 0.18);
		}

		&.danger:hover:not(:disabled) {
			background: rgba(220, 60, 60, 0.18);
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	:global(.splash-context-sep) {
		height: 1px;
		margin: 3px 4px;
		background: var(--color-border, rgba(255, 255, 255, 0.1));
	}
</style>
