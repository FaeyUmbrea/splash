<script lang='ts'>
	import { createEventDispatcher } from 'svelte';
	import { SplashAPI } from '../../api/api.ts';

	/** Object holding the action property (e.g. a button sprite) and which key to edit. */
	export let owner: Record<string, any>;
	export let key: string;
	export let states: string[];

	const dispatch = createEventDispatcher<{ change: void }>();
	const change = () => dispatch('change');
	const actions = SplashAPI.getInstance().registeredActions;
	const macros = (game.macros?.contents ?? []).map(m => ({ id: m.id, name: m.name }));

	const defaults: Record<string, () => object> = {
		'close': () => ({ type: 'close' }),
		'macro': () => ({ type: 'macro', macro: null }),
		'change-state': () => ({ type: 'change-state', load: [], unload: [] }),
	};

	function setType(event: Event) {
		const type = (event.target as HTMLSelectElement).value;
		owner[key] = defaults[type]?.() ?? { type: 'close' };
		change();
	}

	function toggle(list: 'load' | 'unload', stateId: string) {
		const current: string[] = owner[key][list] ?? [];
		owner[key][list] = current.includes(stateId)
			? current.filter(s => s !== stateId)
			: [...current, stateId];
		change();
	}
</script>

<fieldset class='action-editor'>
	<legend>On Click</legend>
	<label>
		Action
		<select value={owner[key]?.type ?? 'close'} on:change={setType}>
			{#each actions as action (action.type)}
				<option value={action.type}>{action.name}</option>
			{/each}
		</select>
	</label>
	{#if owner[key]?.type === 'macro'}
		<label>
			Macro
			<select bind:value={owner[key].macro} on:change={change}>
				<option value={null}>None</option>
				{#each macros as macro (macro.id)}
					<option value={macro.id}>{macro.name}</option>
				{/each}
			</select>
		</label>
	{:else if owner[key]?.type === 'change-state'}
		<div class='state-lists'>
			<div>
				<span>Load</span>
				{#each states as stateId (stateId)}
					<label class='check'>
						<input
							type='checkbox'
							checked={(owner[key].load ?? []).includes(stateId)}
							on:change={() => toggle('load', stateId)}
						/>
						{stateId}
					</label>
				{/each}
			</div>
			<div>
				<span>Unload</span>
				{#each states as stateId (stateId)}
					<label class='check'>
						<input
							type='checkbox'
							checked={(owner[key].unload ?? []).includes(stateId)}
							on:change={() => toggle('unload', stateId)}
						/>
						{stateId}
					</label>
				{/each}
			</div>
		</div>
	{/if}
</fieldset>

<style lang='scss'>
	.action-editor {
		border: 1px solid #444;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		margin: 0.25rem 0;

		legend {
			font-size: 0.8em;
			opacity: 0.8;
		}

		label {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin-bottom: 0.25rem;
			font-size: 0.85em;

			select {
				flex: 1;
				min-width: 0;
				color: #fff;
				background: #ffffff10;
			}
		}

		.state-lists {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
			font-size: 0.85em;

			span {
				font-weight: bold;
			}

			.check {
				display: flex;
				gap: 0.25rem;
				margin: 0;
			}
		}
	}
</style>
