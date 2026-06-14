<svelte:options runes={true} />
<script lang='ts'>
	import { IconButton } from '../ui';
	import ActionEditor from './ActionEditor.svelte';

	type Action = Record<string, unknown> & { type?: string };

	const {
		actions,
		states,
		onChange,
	}: {
		actions: Action[];
		states: string[];
		onChange: (actions: Action[]) => void;
	} = $props();

	function add() {
		onChange([...actions, { type: 'close' }]);
	}
	function remove(index: number) {
		onChange(actions.filter((_, i) => i !== index));
	}
	function setAt(index: number, action: Action) {
		onChange(actions.map((a, i) => (i === index ? action : a)));
	}
</script>

<div class='action-list'>
	{#each actions as action, i (i)}
		<div class='item'>
			<div class='item-head'>
				<span>Action {i + 1}</span>
				<IconButton icon='fa-solid fa-trash' title='Remove action' danger onclick={() => remove(i)} />
			</div>
			<ActionEditor {action} {states} onChange={a => setAt(i, a)} />
		</div>
	{/each}
	<IconButton icon='fa-solid fa-plus' title='Add action' onclick={add} />
</div>

<style lang='scss'>
	.action-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.item {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		border-radius: 4px;

		.item-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: 12px;
		}
	}
</style>
