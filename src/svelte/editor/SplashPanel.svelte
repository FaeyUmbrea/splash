<script lang='ts'>
	import type { SplashCreate } from '../../datamodel/SplashModel.ts';
	import { createEventDispatcher } from 'svelte';
	import AnimationEditor from './AnimationEditor.svelte';

	export let working: SplashCreate;

	const dispatch = createEventDispatcher<{ change: void }>();
	const change = () => dispatch('change');

	function renameState(stateId: string, event: Event) {
		working.states = { ...working.states, [stateId]: (event.target as HTMLInputElement).value };
		change();
	}

	function toggleInitial(stateId: string) {
		const initial = (working.initialState ?? []).filter(Boolean) as string[];
		working.initialState = initial.includes(stateId)
			? initial.filter(s => s !== stateId)
			: [...initial, stateId];
		change();
	}
</script>

<aside class='splash-panel'>
	<h2>Splash</h2>

	<h3>States</h3>
	{#each Object.entries(working.states ?? {}) as [stateId, label] (stateId)}
		<label class='state-row'>
			<input
				type='checkbox'
				title='Load initially'
				checked={(working.initialState ?? []).includes(stateId)}
				on:change={() => toggleInitial(stateId)}
			/>
			<span class='id'>{stateId}</span>
			<input type='text' value={label} on:change={event => renameState(stateId, event)} />
		</label>
	{/each}
	<p class='hint'>Checked states load when the splash opens.</p>

	<AnimationEditor owner={working} key='animIn' label='Animation In' on:change={change} />
	<AnimationEditor owner={working} key='animOut' label='Animation Out' on:change={change} />
</aside>

<style lang='scss'>
	.splash-panel {
		position: absolute;
		top: 4rem;
		right: 1rem;
		width: 280px;
		max-height: 70vh;
		overflow-y: auto;
		background: #000000d0;
		border: 1px solid #666;
		border-radius: 6px;
		padding: 0.5rem;
		color: #fff;
		z-index: 10;

		h2 {
			margin: 0 0 0.5rem;
			font-size: 1rem;
			border: none;
		}

		h3 {
			margin: 0.5rem 0 0.25rem;
			font-size: 0.9rem;
			border: none;
		}

		.state-row {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin-bottom: 0.25rem;
			font-size: 0.85em;

			.id {
				opacity: 0.7;
				min-width: 4rem;
			}

			input[type='text'] {
				flex: 1;
				min-width: 0;
				color: #fff;
				background: #ffffff10;
			}
		}

		.hint {
			font-size: 0.75em;
			opacity: 0.7;
			margin: 0.25rem 0;
		}
	}
</style>
