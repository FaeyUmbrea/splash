<script lang='ts'>
	import { createEventDispatcher } from 'svelte';
	import { SplashAPI } from '../../api/api.ts';

	/** Object holding the animation property (splash, state, or sprite) and which key to edit. */
	export let owner: Record<string, any>;
	export let key: 'animIn' | 'animOut';
	export let label: string;

	const dispatch = createEventDispatcher<{ change: void }>();
	const change = () => dispatch('change');
	const animations = SplashAPI.getInstance().registeredAnimations;

	function setType(event: Event) {
		const type = (event.target as HTMLSelectElement).value;
		if (!type) {
			owner[key] = null;
		} else if (type === 'dissolve') {
			owner[key] = {
				type: 'dissolve',
				delay: 0,
				duration: 3000,
				props: { type: 'randomOrigins', randomOrigins: true, numOrigins: 2 },
			};
		} else if (type === 'glitch') {
			owner[key] = {
				type: 'glitch',
				delay: 0,
				duration: 3000,
				props: {
					origins: { type: 'randomOrigins', randomOrigins: true, numOrigins: 2 },
					bands: 20,
					intensity: 0.05,
					tint: '#0044ff',
					invert: false,
				},
			};
		}
		change();
	}

	function setOriginMode(event: Event) {
		const mode = (event.target as HTMLSelectElement).value;
		owner[key].props = mode === 'fixedOrigins'
			? { type: 'fixedOrigins', origins: [0, 0] }
			: { type: 'randomOrigins', randomOrigins: true, numOrigins: 2 };
		change();
	}

	function setOrigins(event: Event) {
		const numbers = (event.target as HTMLInputElement).value.split(',').map(part => Number(part.trim())).filter(n => !Number.isNaN(n));
		owner[key].props.origins = numbers;
		change();
	}
</script>

<fieldset class='animation-editor'>
	<legend>{label}</legend>
	<label>
		Type
		<select value={owner[key]?.type ?? ''} on:change={setType}>
			<option value=''>None</option>
			{#each animations as animation (animation.type)}
				<option value={animation.type}>{animation.name}</option>
			{/each}
		</select>
	</label>
	{#if owner[key]}
		<label>Delay (ms) <input type='number' bind:value={owner[key].delay} on:change={change} /></label>
		<label>Duration (ms) <input type='number' bind:value={owner[key].duration} on:change={change} /></label>
		{#if owner[key].type === 'glitch'}
			<label>Bands <input type='number' min='1' bind:value={owner[key].props.bands} on:change={change} /></label>
			<label>Intensity <input type='number' step='0.01' min='0' max='1' bind:value={owner[key].props.intensity} on:change={change} /></label>
			<label>Tint <input type='color' bind:value={owner[key].props.tint} on:change={change} /></label>
			<label class='check'>
				<input type='checkbox' bind:checked={owner[key].props.invert} on:change={change} />
				Invert (corrupt instead of reveal)
			</label>
		{/if}
		{#if owner[key].type === 'dissolve'}
			<label>
				Origins
				<select value={owner[key].props?.type ?? 'randomOrigins'} on:change={setOriginMode}>
					<option value='randomOrigins'>Random</option>
					<option value='fixedOrigins'>Fixed</option>
				</select>
			</label>
			{#if owner[key].props?.type === 'randomOrigins'}
				<label>Count <input type='number' min='1' max='16' bind:value={owner[key].props.numOrigins} on:change={change} /></label>
			{:else}
				<label>
					Points (x,y,...)
					<input type='text' value={(owner[key].props?.origins ?? []).join(', ')} on:change={setOrigins} />
				</label>
			{/if}
		{/if}
	{/if}
</fieldset>

<style lang='scss'>
	.animation-editor {
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

			input,
			select {
				flex: 1;
				min-width: 0;
				color: #fff;
				background: #ffffff10;
			}
		}
	}
</style>
