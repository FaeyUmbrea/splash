<script lang='ts'>
	import type { SplashCreate } from '../../datamodel/SplashModel.ts';
	import { createEventDispatcher } from 'svelte';
	import ActionListEditor from './ActionListEditor.svelte';
	import AnimationEditor from './AnimationEditor.svelte';

	export let working: SplashCreate;

	const dispatch = createEventDispatcher<{ change: void }>();
	const change = () => dispatch('change');

	let valueKey = '';

	function toggleInitial(stateId: string) {
		const initial = (working.initialState ?? []).filter(Boolean) as string[];
		working.initialState = initial.includes(stateId)
			? initial.filter(s => s !== stateId)
			: [...initial, stateId];
		change();
	}

	function addValue() {
		if (!valueKey) return;
		working.values = { ...(working.values ?? {}), [valueKey]: '' };
		valueKey = '';
		change();
	}

	function removeValue(key: string) {
		const values = { ...(working.values ?? {}) };
		delete values[key];
		working.values = values;
		change();
	}

	$: stateIds = Object.keys(working.states ?? {});
</script>

<aside class='splash-panel'>
	<h2>Splash</h2>

	<h3>States</h3>
	{#each Object.entries(working.states ?? {}) as [stateId, def] (stateId)}
		<div class='state-block'>
			<label class='state-row'>
				<input
					type='checkbox'
					title='Load initially'
					checked={(working.initialState ?? []).includes(stateId)}
					on:change={() => toggleInitial(stateId)}
				/>
				<span class='id'>{stateId}</span>
				<input type='text' bind:value={def.label} on:change={change} />
			</label>
			<ActionListEditor owner={def} key='onEnter' label='On enter' states={stateIds} on:change={change} />
		</div>
	{/each}
	<p class='hint'>Checked states load when the splash opens.</p>

	<h3>Values</h3>
	{#each Object.entries(working.values ?? {}) as [key] (key)}
		<div class='value-row'>
			<span class='id'>{key}</span>
			<input type='text' title='Initial value' bind:value={working.values[key]} on:change={change} />
			<button type='button' title='Remove value' on:click={() => removeValue(key)}>
				<i class='fas fa-x'></i>
			</button>
		</div>
	{/each}
	<div class='value-row new'>
		<input type='text' placeholder='new value key' bind:value={valueKey} />
		<button type='button' title='Add value' on:click={addValue}><i class='fas fa-plus'></i></button>
	</div>
	<p class='hint'>Use values in text sprites as &#123;key&#125; and in actions/conditions.</p>

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

		.state-block {
			margin-bottom: 0.5rem;
		}

		.state-row,
		.value-row {
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

		.value-row button {
			background: none;
			border: 1px solid #666;
			border-radius: 4px;
			color: #fff;
			cursor: pointer;
			font-size: 0.8em;
		}

		.hint {
			font-size: 0.75em;
			opacity: 0.7;
			margin: 0.25rem 0;
		}
	}
</style>
