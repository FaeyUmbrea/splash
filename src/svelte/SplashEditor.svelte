<script lang='ts'>
	import type { SplashCreate } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import type { SplashPage } from '../utils/launch.ts';
	import EditorCanvas from './editor/EditorCanvas.svelte';
	import InspectorPanel from './editor/InspectorPanel.svelte';
	import LayersPanel from './editor/LayersPanel.svelte';
	import StateTabs from './editor/StateTabs.svelte';

	export let foundryApp: SvelteApplication;

	export let page: SplashPage;

	let working: SplashCreate = page.system.toObject();
	let activeState: string = Object.keys(working.states ?? {})[0] ?? 'initial';
	let selectedId: string | null = null;
	let dirty = false;

	$: selected = (working.children ?? []).find(child => child?.id === selectedId) ?? null;

	function touch() {
		dirty = true;
		working = working;
	}

	async function save() {
		const system = foundry.utils.deepClone(working);
		// TypedObjectField updates merge by key: removed states need explicit deletion keys.
		for (const key of Object.keys(page.system.states ?? {})) {
			if (!(key in (system.states ?? {}))) {
				(system.states as Record<string, unknown>)[`-=${key}`] = null;
			}
		}
		await page.update({ system });
		dirty = false;
		ui.notifications?.info('Splash | Saved.');
	}

	async function exit() {
		if (dirty) {
			const discard = await foundry.applications.api.DialogV2.confirm({
				window: { title: 'Unsaved changes' },
				content: '<p>Discard unsaved splash changes?</p>',
			});
			if (!discard) return;
		}
		foundryApp.close();
	}
</script>

<div class='splash-editor'>
	<EditorCanvas
		{working}
		{activeState}
		{selectedId}
		on:select={event => selectedId = event.detail}
		on:change={touch}
	/>

	<header class='toolbar'>
		<h1>{page.name}{dirty ? ' *' : ''}</h1>
		<StateTabs
			{working}
			{activeState}
			on:activate={event => activeState = event.detail}
			on:change={touch}
		/>
		<button type='button' class='save' title='Save' on:click={save}>
			<i class='fas fa-save'></i>
		</button>
		<button type='button' class='exit' title='Exit' on:click={exit}>
			<i class='fas fa-x'></i>
		</button>
	</header>

	<LayersPanel
		{working}
		{activeState}
		{selectedId}
		on:select={event => selectedId = event.detail}
		on:change={touch}
	/>

	{#if selected}
		<InspectorPanel
			sprite={selected}
			{activeState}
			on:change={touch}
		/>
	{/if}
</div>

<style lang='scss'>
	:global(#splash-editor) {
		position: fixed;
		inset: 0;
		margin: 0;
		padding: 0;
		border: none;
		background: none;
		// Above Foundry's interface layers (hotbar, sidebar) but below tooltips/notifications.
		z-index: 9000;
	}

	.splash-editor {
		position: absolute;
		width: 100%;
		height: 100%;
		background: #00000080;
		z-index: 100;

		.toolbar {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			display: flex;
			align-items: center;
			gap: 1rem;
			padding: 0.5rem 1rem;
			background: #000000d0;
			z-index: 10;

			h1 {
				flex: 1;
				margin: 0;
				font-size: 1.1rem;
				color: #fff;
				border: none;
			}

			.save,
			.exit {
				background: none;
				border: 1px solid #666;
				border-radius: 4px;
				color: #fff;
				cursor: pointer;
			}
		}
	}
</style>
