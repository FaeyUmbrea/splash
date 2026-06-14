<svelte:options runes={true} />
<script lang='ts'>
	import type { SvelteApplication } from '../../mixins/SvelteApplicationMixin.svelte.ts';
	import type { SplashPage } from '../../utils/launch.ts';
	import { onDestroy, onMount } from 'svelte';
	import { closeSplashOverlay } from '../../apps/overlay.ts';
	import { SvelteRenderer } from '../../apps/SvelteRenderer.ts';
	import { SplashModel } from '../../datamodel/SplashModel.ts';
	import SplashUI from '../SplashUI.svelte';
	import CanvasFrame from './CanvasFrame.svelte';
	import { DocumentStore } from './documentStore.svelte.ts';
	import Inspector from './Inspector.svelte';
	import LayersPanel from './LayersPanel.svelte';
	import SplashSettings from './SplashSettings.svelte';
	import StateTabs from './StateTabs.svelte';

	const { foundryApp, page }: { foundryApp: SvelteApplication; page: SplashPage } = $props();

	const store = new DocumentStore(page);
	let activeState = $state(Object.keys(page.system.states ?? {})[0] ?? 'initial');
	let selectedId = $state<string | null>(null);

	onDestroy(() => store.destroy());

	// Keep the active state valid as states change underneath us (rename/delete/sync).
	$effect(() => {
		if (!store.data.states?.[activeState]) {
			activeState = Object.keys(store.data.states ?? {})[0] ?? 'initial';
		}
	});

	// Clear a selection that points at a sprite that no longer exists (deleted here or by sync).
	$effect(() => {
		if (selectedId && !(store.data.children ?? []).some(c => c.id === selectedId)) {
			selectedId = null;
		}
	});

	function activate(state: string) {
		activeState = state;
		selectedId = null;
	}

	// Frameless host has no close transition, so skip the animation wait — instant close.
	function close() {
		void foundryApp.close({ animate: false });
	}

	// Preview runs the real runtime on the CURRENT (already-saved) document data.
	async function preview() {
		await closeSplashOverlay();
		const model = new SplashModel(foundry.utils.deepClone(store.data));
		new SvelteRenderer(
			SplashUI,
			{ splashConfig: model },
			{ id: 'splash-application', classes: ['splash-overlay', 'splash-preview'] },
		).render(true);
	}

	function onKeydown(event: KeyboardEvent) {
		if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
		event.preventDefault();
		if (event.shiftKey) void store.redo();
		else void store.undo();
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<div class='splash-editor themed'>
	<CanvasFrame {store} {activeState} {selectedId} onSelect={id => (selectedId = id)} />

	<header class='toolbar'>
		<h1 class='title'>{page.name}</h1>
		<StateTabs {store} {activeState} onActivate={activate} />
		<button type='button' class='tool-btn' title='Undo (Ctrl+Z)' aria-label='Undo' disabled={!store.canUndo} onclick={() => store.undo()}>
			<i class='fa-solid fa-rotate-left'></i>
		</button>
		<button type='button' class='tool-btn' title='Redo (Ctrl+Shift+Z)' aria-label='Redo' disabled={!store.canRedo} onclick={() => store.redo()}>
			<i class='fa-solid fa-rotate-right'></i>
		</button>
		<button type='button' class='tool-btn' title='Preview' aria-label='Preview' onclick={preview}>
			<i class='fa-solid fa-play'></i>
		</button>
		<button type='button' class='close-btn' title='Close editor' aria-label='Close editor' onclick={close}>
			<i class='fa-solid fa-xmark'></i>
		</button>
	</header>

	<aside class='layers'>
		<LayersPanel {store} {activeState} {selectedId} onSelect={id => (selectedId = id)} />
	</aside>

	<aside class='inspector'>
		{#if selectedId}
			<Inspector {store} {selectedId} {activeState} />
		{:else}
			<SplashSettings {store} {activeState} />
		{/if}
	</aside>
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

	:global(#splash-application.splash-preview) {
		z-index: 9100;
	}

	.splash-editor {
		position: absolute;
		inset: 0;
		background: #00000080;
		color: #fff;

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

			.title {
				flex: 0 0 auto;
				margin: 0;
				font-size: 1.1rem;
				color: #fff;
				border: none;
			}

			.tool-btn,
			.close-btn {
				flex: 0 0 auto;
				width: 32px;
				height: 32px;
				background: transparent;
				border: 1px solid #666;
				border-radius: 4px;
				color: #fff;
				cursor: pointer;

				&:disabled {
					opacity: 0.35;
					cursor: not-allowed;
				}
			}
		}

		.layers {
			position: absolute;
			top: 4rem;
			left: 1rem;
			width: 220px;
			max-height: 75vh;
			overflow-y: auto;
			z-index: 10;
		}

		.inspector {
			position: absolute;
			top: 4rem;
			right: 1rem;
			width: 280px;
			max-height: 75vh;
			overflow-y: auto;
			z-index: 10;
		}
	}
</style>
