<svelte:options runes={true} />
<script lang='ts'>
	import type { Tab } from './types';

	let {
		tabs,
		value = $bindable(),
		onChange,
		onContext,
	}: {
		tabs: Tab[];
		value: string;
		onChange?: (id: string) => void;
		/** Right-click on a tab (for a context menu). */
		onContext?: (id: string, event: MouseEvent) => void;
	} = $props();

	function select(tab: Tab) {
		if (tab.disabled || tab.id === value) return;
		value = tab.id;
		onChange?.(tab.id);
	}
</script>

<div class='splash-tabs' role='tablist'>
	{#each tabs as tab (tab.id)}
		<button
			type='button'
			class='splash-tab'
			class:active={tab.id === value}
			role='tab'
			aria-selected={tab.id === value}
			disabled={tab.disabled}
			onclick={() => select(tab)}
			oncontextmenu={e => onContext?.(tab.id, e)}
		>
			{#if tab.icon}<i class={tab.icon}></i>{/if}
			<span>{tab.label}</span>
		</button>
	{/each}
</div>

<style lang='scss'>
	.splash-tabs {
		display: flex;
		gap: 4px;
	}

	.splash-tab {
		flex: 1;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: transparent;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		border-radius: 3px;
		color: inherit;
		opacity: 0.7;
		cursor: pointer;
		font-size: 12px;
		white-space: nowrap;

		&:hover:not(:disabled) {
			opacity: 1;
		}

		&.active {
			opacity: 1;
			background: rgba(255, 144, 0, 0.15);
			border-color: rgba(255, 144, 0, 0.4);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	}
</style>
