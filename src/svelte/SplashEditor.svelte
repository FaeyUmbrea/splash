<script lang='ts'>
	import type { SplashCreate } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import type { SplashPage } from '../utils/launch.ts';
	import { onDestroy, onMount } from 'svelte';
	import { closeSplashOverlay } from '../apps/overlay.ts';
	import { SvelteRenderer } from '../apps/SvelteRenderer.ts';
	import { SplashModel } from '../datamodel/SplashModel.ts';
	import EditorCanvas from './editor/EditorCanvas.svelte';
	import InspectorPanel from './editor/InspectorPanel.svelte';
	import LayersPanel from './editor/LayersPanel.svelte';
	import SplashPanel from './editor/SplashPanel.svelte';
	import StateTabs from './editor/StateTabs.svelte';
	import SplashUI from './SplashUI.svelte';

	export let foundryApp: SvelteApplication;

	export let page: SplashPage;

	let working: SplashCreate = page.system.toObject();
	let activeState: string = Object.keys(working.states ?? {})[0] ?? 'initial';
	let selectedId: string | null = null;
	let dirty = false;

	$: selected = (working.children ?? []).find(child => child?.id === selectedId) ?? null;

	// Undo history: snapshots are taken shortly after the last change so a
	// whole drag collapses into one entry.
	const history: SplashCreate[] = [foundry.utils.deepClone(working)];
	let redoStack: SplashCreate[] = [];
	let snapshotTimer: ReturnType<typeof setTimeout> | undefined;

	function touch() {
		dirty = true;
		working = working;
		redoStack = [];
		clearTimeout(snapshotTimer);
		snapshotTimer = setTimeout(() => {
			history.push(foundry.utils.deepClone(working));
			snapshotTimer = undefined;
		}, 300);
	}

	function restore(snapshot: SplashCreate) {
		working = foundry.utils.deepClone(snapshot);
		if (!working.states?.[activeState]) {
			activeState = Object.keys(working.states ?? {})[0] ?? 'initial';
		}
		if (!(working.children ?? []).some(child => child?.id === selectedId)) {
			selectedId = null;
		}
		dirty = true;
	}

	function undo() {
		if (snapshotTimer) {
			clearTimeout(snapshotTimer);
			snapshotTimer = undefined;
			history.push(foundry.utils.deepClone(working));
		}
		if (history.length < 2) return;
		redoStack.push(history.pop()!);
		restore(history.at(-1)!);
	}

	function redo() {
		const snapshot = redoStack.pop();
		if (!snapshot) return;
		history.push(snapshot);
		restore(snapshot);
	}

	function onKeydown(event: KeyboardEvent) {
		if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
		event.preventDefault();
		if (event.shiftKey) redo();
		else undo();
	}

	onMount(() => window.addEventListener('keydown', onKeydown));
	onDestroy(() => window.removeEventListener('keydown', onKeydown));

	async function preview() {
		await closeSplashOverlay();
		// Preview runs the real runtime on the unsaved working copy.
		const model = new SplashModel(foundry.utils.deepClone(working));
		new SvelteRenderer(
			SplashUI,
			{ splashConfig: model },
			{ id: 'splash-application', classes: ['splash-overlay', 'splash-preview'] },
		).render(true);
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
		<button type='button' class='preview' title='Preview (unsaved changes included)' on:click={preview}>
			<i class='fas fa-play'></i>
		</button>
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
			states={Object.keys(working.states ?? {})}
			on:change={touch}
		/>
	{:else}
		<SplashPanel {working} on:change={touch} />
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

	// Previews launched from the editor must cover the editor itself.
	:global(#splash-application.splash-preview) {
		z-index: 9100;
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

			.preview,
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
