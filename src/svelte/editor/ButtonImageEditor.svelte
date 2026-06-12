<script lang='ts'>
	import { createEventDispatcher } from 'svelte';

	/** Edits one ButtonImage slot (image/hoverImage/clickImage) including nine-slice borders. */
	export let owner: Record<string, any>;
	export let key: 'image' | 'hoverImage' | 'clickImage';
	export let label: string;
	/** The base image cannot be removed; the hover/click variants are optional. */
	export let required: boolean = false;

	const dispatch = createEventDispatcher<{ change: void }>();
	const change = () => dispatch('change');

	function toggle() {
		owner[key] = owner[key]
			? null
			: { url: '', leftWidth: 0, rightWidth: 0, topHeight: 0, bottomHeight: 0 };
		change();
	}

	function browse() {
		new foundry.applications.apps.FilePicker({
			type: 'image',
			current: owner[key]?.url || undefined,
			callback: (path: string) => {
				owner[key].url = path;
				change();
			},
		}).render(true);
	}
</script>

<fieldset class='button-image-editor'>
	<legend>
		{label}
		{#if !required}
			<input type='checkbox' title='Enable' checked={!!owner[key]} on:change={toggle} />
		{/if}
	</legend>
	{#if owner[key]}
		<label class='url'>
			Image
			<input type='text' bind:value={owner[key].url} on:change={change} />
			<button type='button' title='Browse' on:click={browse}><i class='fas fa-folder-open'></i></button>
		</label>
		<div class='slices'>
			<label>Left <input type='number' min='0' bind:value={owner[key].leftWidth} on:change={change} /></label>
			<label>Right <input type='number' min='0' bind:value={owner[key].rightWidth} on:change={change} /></label>
			<label>Top <input type='number' min='0' bind:value={owner[key].topHeight} on:change={change} /></label>
			<label>Bottom <input type='number' min='0' bind:value={owner[key].bottomHeight} on:change={change} /></label>
		</div>
	{/if}
</fieldset>

<style lang='scss'>
	.button-image-editor {
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

		.url button {
			background: none;
			border: 1px solid #666;
			border-radius: 4px;
			color: #fff;
			cursor: pointer;
		}

		.slices {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 0.5rem;
		}
	}
</style>
