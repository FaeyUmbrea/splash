<script lang='ts'>
	import type { SplashCreate } from '../../datamodel/SplashModel.ts';
	import { createEventDispatcher } from 'svelte';

	export let working: SplashCreate;
	export let activeState: string;

	const dispatch = createEventDispatcher<{ activate: string; change: void }>();

	function addState() {
		const name = `state-${Object.keys(working.states ?? {}).length + 1}`;
		working.states = { ...(working.states ?? {}), [name]: { label: name, onEnter: [] } };
		dispatch('change');
		dispatch('activate', name);
	}

	function removeState(stateId: string) {
		const states = { ...(working.states ?? {}) };
		delete states[stateId];
		working.states = states;
		for (const child of working.children ?? []) {
			if (child?.states?.[stateId]) {
				const childStates = { ...child.states };
				delete childStates[stateId];
				child.states = childStates;
			}
		}
		dispatch('change');
		if (activeState === stateId) {
			dispatch('activate', Object.keys(states)[0] ?? '');
		}
	}
</script>

<nav class='state-tabs'>
	{#each Object.entries(working.states ?? {}) as [stateId, def] (stateId)}
		<div class='tab' class:active={stateId === activeState}>
			<button type='button' class='activate' on:click={() => dispatch('activate', stateId)}>
				{def?.label || stateId}
			</button>
			<button type='button' class='remove' title='Delete state' on:click={() => removeState(stateId)}>
				<i class='fas fa-x'></i>
			</button>
		</div>
	{/each}
	<button type='button' class='add' title='Add state' on:click={addState}>
		<i class='fas fa-plus'></i>
	</button>
</nav>

<style lang='scss'>
	.state-tabs {
		display: flex;
		gap: 0.25rem;
		align-items: center;

		.tab {
			display: flex;
			align-items: center;
			background: #00000080;
			border: 1px solid #666;
			border-radius: 4px;

			&.active {
				border-color: #ff9800;
			}

			.activate {
				border: none;
				background: none;
				color: #fff;
				cursor: pointer;
			}

			.remove {
				border: none;
				background: none;
				color: #aaa;
				cursor: pointer;
				font-size: 0.7em;
			}
		}

		.add {
			background: #00000080;
			border: 1px solid #666;
			border-radius: 4px;
			color: #fff;
			cursor: pointer;
		}
	}
</style>
