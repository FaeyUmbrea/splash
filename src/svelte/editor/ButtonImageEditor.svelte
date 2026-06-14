<svelte:options runes={true} />
<script lang='ts'>
	import { IconButton, ImageField, NumberField } from '../ui';

	interface Img { url?: string; leftWidth?: number; topHeight?: number; rightWidth?: number; bottomHeight?: number }

	const {
		value,
		label,
		optional = false,
		onPatch,
		onEnable,
		onRemove,
	}: {
		value: Img | null | undefined;
		label: string;
		optional?: boolean;
		onPatch: (patch: Partial<Img>) => void;
		onEnable?: () => void;
		onRemove?: () => void;
	} = $props();
</script>

<div class='button-image'>
	<div class='head'>
		<span class='sublabel'>{label}</span>
		{#if optional}
			{#if value}
				<IconButton icon='fa-solid fa-trash' title='Remove {label}' danger onclick={() => onRemove?.()} />
			{:else}
				<IconButton icon='fa-solid fa-plus' title='Add {label}' onclick={() => onEnable?.()} />
			{/if}
		{/if}
	</div>
	{#if value}
		<ImageField value={value.url ?? ''} onChange={v => onPatch({ url: v })} />
		<div class='grid'>
			<NumberField label='L' value={value.leftWidth ?? 0} onChange={v => onPatch({ leftWidth: v ?? 0 })} />
			<NumberField label='T' value={value.topHeight ?? 0} onChange={v => onPatch({ topHeight: v ?? 0 })} />
			<NumberField label='R' value={value.rightWidth ?? 0} onChange={v => onPatch({ rightWidth: v ?? 0 })} />
			<NumberField label='B' value={value.bottomHeight ?? 0} onChange={v => onPatch({ bottomHeight: v ?? 0 })} />
		</div>
	{/if}
</div>

<style lang='scss'>
	.button-image {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		gap: 4px;
	}
</style>
