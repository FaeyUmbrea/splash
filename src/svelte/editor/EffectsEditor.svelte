<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import { createEventDispatcher } from 'svelte';
	import { SplashAPI } from '../../api/api.ts';

	/** Edits a sprite's persistent (non-transition) effects. GL-only at runtime. */
	export let sprite: SpriteCreate;

	const dispatch = createEventDispatcher<{ change: void }>();
	const change = () => dispatch('change');
	const effectTypes = SplashAPI.getInstance().registeredEffects;

	const defaults: Record<string, () => object> = {
		glitch: () => ({ type: 'glitch', bands: 8, intensity: 0.01, tint: '#0044ff' }),
	};

	function add() {
		const type = effectTypes[0]?.type;
		if (!type) return;
		sprite.effects = [...(sprite.effects ?? []), defaults[type]?.() ?? { type }];
		change();
	}

	function remove(index: number) {
		sprite.effects = (sprite.effects ?? []).filter((_: unknown, i: number) => i !== index);
		change();
	}

	function setType(index: number, event: Event) {
		const type = (event.target as HTMLSelectElement).value;
		sprite.effects = (sprite.effects ?? []).map((effect: unknown, i: number) =>
			i === index ? (defaults[type]?.() ?? { type }) : effect);
		change();
	}
</script>

<fieldset class='effects-editor'>
	<legend>
		Effects (WebGL only)
		<button type='button' title='Add effect' on:click={add}><i class='fas fa-plus'></i></button>
	</legend>
	{#each sprite.effects ?? [] as effect, index (index)}
		<div class='entry'>
			<label>
				Type
				<select value={effect.type} on:change={event => setType(index, event)}>
					{#each effectTypes as effectType (effectType.type)}
						<option value={effectType.type}>{effectType.name}</option>
					{/each}
				</select>
			</label>
			{#if effect.type === 'glitch'}
				<label>Bands <input type='number' min='1' max='16' bind:value={effect.bands} on:change={change} /></label>
				<label>Intensity <input type='number' step='0.005' min='0' max='1' bind:value={effect.intensity} on:change={change} /></label>
				<label>Tint <input type='color' bind:value={effect.tint} on:change={change} /></label>
			{/if}
			<button type='button' title='Remove effect' on:click={() => remove(index)}>
				<i class='fas fa-trash'></i>
			</button>
		</div>
	{/each}
</fieldset>

<style lang='scss'>
	.effects-editor {
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
			border-bottom: 1px solid #333;
			padding-bottom: 0.25rem;
			margin-bottom: 0.25rem;
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
