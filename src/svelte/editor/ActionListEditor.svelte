<script lang='ts'>
	import { createEventDispatcher } from 'svelte';
	import ActionEditor from './ActionEditor.svelte';

	/** Edits an array of actions held at owner[key] (e.g. a state's onEnter list). */
	export let owner: Record<string, any>;
	export let key: string;
	export let label: string;
	export let states: string[];

	const dispatch = createEventDispatcher<{ change: void }>();
	const change = () => dispatch('change');

	function add() {
		owner[key] = [...(owner[key] ?? []), { type: 'close' }];
		change();
	}

	function remove(index: number) {
		owner[key] = (owner[key] ?? []).filter((_: unknown, i: number) => i !== index);
		change();
	}
</script>

<fieldset class='action-list-editor'>
	<legend>
		{label}
		<button type='button' title='Add action' on:click={add}><i class='fas fa-plus'></i></button>
	</legend>
	{#each owner[key] ?? [] as _action, index (index)}
		<div class='entry'>
			<ActionEditor owner={owner[key]} key={String(index)} {states} on:change={change} />
			<button type='button' title='Remove action' on:click={() => remove(index)}>
				<i class='fas fa-trash'></i>
			</button>
		</div>
	{/each}
</fieldset>

<style lang='scss'>
	.action-list-editor {
		border: 1px solid #444;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		margin: 0.25rem 0;

		legend {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.8em;
			opacity: 0.8;
		}

		button {
			background: none;
			border: 1px solid #666;
			border-radius: 4px;
			color: #fff;
			cursor: pointer;
		}

		.entry {
			display: flex;
			align-items: flex-start;
			gap: 0.25rem;

			:global(.action-editor) {
				flex: 1;
			}
		}
	}
</style>
