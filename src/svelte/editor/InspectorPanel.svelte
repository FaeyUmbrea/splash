<script lang='ts'>
	import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
	import { createEventDispatcher } from 'svelte';
	import ActionEditor from './ActionEditor.svelte';
	import AnimationEditor from './AnimationEditor.svelte';
	import ButtonImageEditor from './ButtonImageEditor.svelte';
	import EffectsEditor from './EffectsEditor.svelte';

	export let sprite: SpriteCreate;
	export let activeState: string;
	export let states: string[];

	const dispatch = createEventDispatcher<{ change: void }>();

	const change = () => dispatch('change');

	function browseImage() {
		new foundry.applications.apps.FilePicker({
			type: 'image',
			current: sprite.type === 'image' ? sprite.img : undefined,
			callback: (path: string) => {
				if (sprite.type === 'image') sprite.img = path;
				change();
			},
		}).render(true);
	}
</script>

<aside class='inspector-panel'>
	<h2>{sprite.name || sprite.id}</h2>
	<label>Name <input type='text' bind:value={sprite.name} on:change={change} /></label>

	{#if sprite.type === 'image'}
		<label class='with-button'>
			Image
			<input type='text' bind:value={sprite.img} on:change={change} />
			<button type='button' title='Browse' on:click={browseImage}><i class='fas fa-folder-open'></i></button>
		</label>
	{:else if sprite.type === 'text'}
		<label>Text <input type='text' bind:value={sprite.text} on:change={change} /></label>
		<label>Font <input type='text' bind:value={sprite.font} on:change={change} /></label>
		<label>Size <input type='number' bind:value={sprite.size} on:change={change} /></label>
		<label>Color <input type='color' bind:value={sprite.fillColor} on:change={change} /></label>
	{:else if sprite.type === 'button'}
		<label>Label <input type='text' bind:value={sprite.label.text} on:change={change} /></label>
		<label>Label size <input type='number' bind:value={sprite.label.fontSize} on:change={change} /></label>
		<label>Label color <input type='color' bind:value={sprite.label.fill} on:change={change} /></label>
		<ButtonImageEditor owner={sprite} key='image' label='Image' required on:change={change} />
		<ButtonImageEditor owner={sprite} key='hoverImage' label='Hover image' on:change={change} />
		<ButtonImageEditor owner={sprite} key='clickImage' label='Click image' on:change={change} />
		<ActionEditor owner={sprite} key='onClick' {states} on:change={change} />
	{/if}

	{#if sprite.states?.[activeState]}
		<h3>Placement ({activeState})</h3>
		<div class='grid'>
			<label>X <input type='number' bind:value={sprite.states[activeState].x} on:change={change} /></label>
			<label>Y <input type='number' bind:value={sprite.states[activeState].y} on:change={change} /></label>
			<label>W <input type='number' bind:value={sprite.states[activeState].width} on:change={change} /></label>
			<label>H <input type='number' bind:value={sprite.states[activeState].height} on:change={change} /></label>
			<label>Z <input type='number' bind:value={sprite.states[activeState].zIndex} on:change={change} /></label>
			<label>Priority <input type='number' bind:value={sprite.states[activeState].priority} on:change={change} /></label>
		</div>
		<AnimationEditor owner={sprite.states[activeState]} key='animIn' label='Animation In' on:change={change} />
		<AnimationEditor owner={sprite.states[activeState]} key='animOut' label='Animation Out' on:change={change} />
		<EffectsEditor {sprite} on:change={change} />
	{:else}
		<p class='hint'>Not placed in this state.</p>
	{/if}
</aside>

<style lang='scss'>
	.inspector-panel {
		position: absolute;
		top: 4rem;
		right: 1rem;
		width: 260px;
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
			margin: 0.75rem 0 0.25rem;
			font-size: 0.9rem;
			border: none;
		}

		label {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin-bottom: 0.25rem;
			font-size: 0.85em;

			input {
				flex: 1;
				min-width: 0;
				color: #fff;
				background: #ffffff10;
			}
		}

		.with-button button {
			background: none;
			border: 1px solid #666;
			border-radius: 4px;
			color: #fff;
			cursor: pointer;
		}

		.grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 0.5rem;
		}
	}
</style>
