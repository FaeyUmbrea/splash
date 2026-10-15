<svelte:options runes={true} />
<script lang='ts'>
	import type { EditorModel } from './editorModel.svelte.ts';
	import { onMount } from 'svelte';
	import { closeSplashOverlay } from '../../apps/overlay.ts';
	import { SvelteRenderer } from '../../apps/SvelteRenderer.ts';
	import { SplashModel } from '../../datamodel/SplashModel.ts';
	import { DOCUMENTATION_URL, PATREON_URL } from '../../utils/const.ts';
	import PreviewHost from '../PreviewHost.svelte';
	import ArrangementToolbar from './ArrangementToolbar.svelte';
	import CanvasFrame from './CanvasFrame.svelte';
	import ConnectionIssues from './ConnectionIssues.svelte';
	import EditorStart from './EditorStart.svelte';
	import ObjectsPanel from './ObjectsPanel.svelte';
	import SaveStatus from './SaveStatus.svelte';
	import Sidebar from './Sidebar.svelte';
	import StatesPanel from './StatesPanel.svelte';

	const { model }: { model: EditorModel } = $props();

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
		await closeSplashOverlay({ skipOutro: true });
		const splash = new SplashModel(foundry.utils.deepClone(model.data));
		new SvelteRenderer(
			PreviewHost,
			{ splashConfig: splash, issues: foundry.utils.deepClone(model.actionIssues) },
			{ id: 'splash-application', classes: ['splash-overlay', 'splash-preview'] },
		).render(true);
	}

	function isTyping() {
		const el = document.activeElement;
		return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
	}

	/** Handle document shortcuts while leaving editable fields' native history intact. */
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
		if (event.defaultPrevented || isTyping() || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
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
		<ArrangementToolbar {model} />
		<div class='spacer'></div>
		<a class='help-link' href={DOCUMENTATION_URL} target='_blank' rel='noopener noreferrer'><i class='fa-solid fa-book-open'></i> {game.i18n.localize('splash.editor.editor.guide')}</a>
		<a class='help-link' href={PATREON_URL} target='_blank' rel='noopener noreferrer'><i class='fa-solid fa-heart'></i> Patreon</a>
		<button type='button' class='tool' title={game.i18n.localize('splash.editor.editor.undoTooltip')} aria-label={game.i18n.localize('splash.editor.editor.undo')} disabled={!model.canUndo} onclick={() => model.undo()}><i class='fa-solid fa-rotate-left'></i></button>
		<button type='button' class='tool' title={game.i18n.localize('splash.editor.editor.redoTooltip')} aria-label={game.i18n.localize('splash.editor.editor.redo')} disabled={!model.canRedo} onclick={() => model.redo()}><i class='fa-solid fa-rotate-right'></i></button>
		<button type='button' class='tool' title={game.i18n.localize('splash.actions.preview')} aria-label={game.i18n.localize('splash.actions.preview')} onclick={preview}><i class='fa-solid fa-play'></i></button>
	</header>

	<SaveStatus store={model.store} />
	<ConnectionIssues issues={model.actionIssues} />

	<div class='workspace'>
		<aside class='left'>
			<div class='dock objects'><ObjectsPanel {model} /></div>
			<div class='dock states'><StatesPanel {model} /></div>
		</aside>

		{#if model.objects.length}
			<CanvasFrame {model} />
		{:else}
			<EditorStart onScratch={() => (model.adding = 'object')} onPrefab={() => (model.adding = 'prefab')} />
		{/if}

		<aside class='right'>
			<Sidebar {model} />
		</aside>
	</div>
</div>

<style lang='scss'>
	// No z-index hack: a normal Foundry window lets pop-outs like file pickers stack above it.
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
		// Opaque so the scene behind never bleeds through.
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

			.help-link {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				color: #bbb;
				font-size: 12px;
				white-space: nowrap;
			}
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
			width: 360px;
			border-left: 1px solid rgba(255, 255, 255, 0.08);
		}
	}
</style>
