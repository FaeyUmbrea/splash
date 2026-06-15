<svelte:options runes={true} />
<script lang='ts'>
	import type { SplashPage } from '../../utils/launch.ts';
	import { onDestroy, onMount } from 'svelte';
	import { closeSplashOverlay } from '../../apps/overlay.ts';
	import { SvelteRenderer } from '../../apps/SvelteRenderer.ts';
	import { SplashModel } from '../../datamodel/SplashModel.ts';
	import PreviewHost from '../PreviewHost.svelte';
	import CanvasFrame from './CanvasFrame.svelte';
	import { EditorModel } from './editorModel.svelte.ts';
	import ObjectsPanel from './ObjectsPanel.svelte';
	import Sidebar from './Sidebar.svelte';
	import StatesPanel from './StatesPanel.svelte';

	const { page }: { page: SplashPage } = $props();

	const model = new EditorModel(page);
	onDestroy(() => model.destroy());

	// Keep the active state valid, and clear a selection pointing at a deleted object.
	$effect(() => {
		if (!model.data.states?.[model.activeState]) {
			model.activeState = Object.keys(model.data.states ?? {})[0] ?? 'initial';
		}
	});
	$effect(() => {
		const valid = model.selectedIds.filter(id => model.objects.some(o => o.id === id));
		if (valid.length !== model.selectedIds.length) model.selectedIds = valid;
	});

	async function preview() {
		// Preview replaces whatever overlay is on screen — drop it instantly rather than playing its outro.
		await closeSplashOverlay({ skipOutro: true });
		const splash = new SplashModel(foundry.utils.deepClone(model.data));
		new SvelteRenderer(
			PreviewHost,
			{ splashConfig: splash },
			{ id: 'splash-application', classes: ['splash-overlay', 'splash-preview'] },
		).render(true);
	}

	function isTyping() {
		const el = document.activeElement;
		return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isTyping() && model.activeGroup) {
			event.preventDefault();
			model.exitGroup();
			return;
		}
		if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping() && model.selectedIds.length) {
			event.preventDefault();
			model.deleteSelected();
			return;
		}
		if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
		event.preventDefault();
		if (event.shiftKey) model.redo();
		else model.undo();
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<div class='splash-editor themed'>
	<header class='toolbar'>
		<div class='spacer'></div>
		<button type='button' class='tool' title={game.i18n.localize('splash.editor.editor.undoTooltip')} aria-label={game.i18n.localize('splash.editor.editor.undo')} disabled={!model.canUndo} onclick={() => model.undo()}><i class='fa-solid fa-rotate-left'></i></button>
		<button type='button' class='tool' title={game.i18n.localize('splash.editor.editor.redoTooltip')} aria-label={game.i18n.localize('splash.editor.editor.redo')} disabled={!model.canRedo} onclick={() => model.redo()}><i class='fa-solid fa-rotate-right'></i></button>
		<button type='button' class='tool' title={game.i18n.localize('splash.actions.preview')} aria-label={game.i18n.localize('splash.actions.preview')} onclick={preview}><i class='fa-solid fa-play'></i></button>
	</header>

	<div class='workspace'>
		<aside class='left'>
			<div class='dock objects'><ObjectsPanel {model} /></div>
			<div class='dock states'><StatesPanel {model} /></div>
		</aside>

		<CanvasFrame {model} />

		<aside class='right'>
			<Sidebar {model} />
		</aside>
	</div>
</div>

<style lang='scss'>
	// No z-index hack: the editor is a normal Foundry window, so pop-outs (file pickers, dialogs) stack above it.
	:global(.splash-editor-content) {
		padding: 0 !important;
		overflow: hidden;
	}

	:global(#splash-application.splash-preview) {
		z-index: 9100;
	}

	.splash-editor {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		// Opaque so the scene behind never bleeds through and renders the UI illegible.
		background: #1b1b1e;
		color: #e6e6e6;

		.toolbar {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 6px 12px;
			background: #141416;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
			flex: 0 0 auto;

			.spacer {
				flex: 1;
			}

			.tool {
				width: 32px;
				height: 32px;
				background: transparent;
				border: 1px solid rgba(255, 255, 255, 0.15);
				border-radius: 4px;
				color: inherit;
				cursor: pointer;

				&:hover:not(:disabled) {
					border-color: rgba(255, 144, 0, 0.5);
				}

				&:disabled {
					opacity: 0.35;
					cursor: not-allowed;
				}
			}
		}

		.workspace {
			flex: 1;
			min-height: 0;
			display: flex;
		}

		.left,
		.right {
			flex: 0 0 auto;
			background: #202024;
			display: flex;
			flex-direction: column;
			min-height: 0;
		}

		.left {
			width: 240px;
			border-right: 1px solid rgba(255, 255, 255, 0.08);

			.dock {
				display: flex;
				flex-direction: column;
				min-height: 0;

				&.objects {
					flex: 1 1 60%;
					border-bottom: 1px solid rgba(255, 255, 255, 0.08);
				}

				&.states {
					flex: 1 1 40%;
				}
			}
		}

		.right {
			width: 300px;
			border-left: 1px solid rgba(255, 255, 255, 0.08);
		}
	}
</style>
