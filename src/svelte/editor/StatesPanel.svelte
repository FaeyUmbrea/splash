<svelte:options runes={true} />
<script lang='ts'>
	import type { ContextMenuItem } from '../ui';
	import type { EditorModel, EditorState } from './editorModel.svelte.ts';
	import { ContextMenu, IconButton } from '../ui';

	const { model }: { model: EditorModel } = $props();

	let rowMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	async function rename(state: EditorState) {
		const label = await foundry.applications.api.DialogV2.prompt({
			window: { title: game.i18n.localize('splash.editor.statesPanel.renameTitle') },
			content: `<input name="label" type="text" value="${state.label}" autofocus style="width:100%">`,
			ok: { callback: (_e: Event, button: HTMLButtonElement) => (button.form?.elements.namedItem('label') as HTMLInputElement)?.value },
		}).catch(() => null);
		if (label != null) model.renameState(state.key, label);
	}

	function openRowMenu(event: MouseEvent, state: EditorState) {
		event.preventDefault();
		event.stopPropagation();
		rowMenu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				{ label: game.i18n.localize('splash.editor.statesPanel.rename'), icon: 'fa-solid fa-pen', action: () => void rename(state) },
				{ label: game.i18n.localize('splash.editor.statesPanel.duplicate'), icon: 'fa-solid fa-clone', action: () => model.duplicateState(state.key) },
				{ label: game.i18n.localize('splash.editor.statesPanel.setSoleInitial'), icon: 'fa-solid fa-flag', action: () => model.setSoleInitial(state.key) },
				{ separator: true },
				{ label: game.i18n.localize('splash.editor.statesPanel.delete'), icon: 'fa-solid fa-trash', danger: true, action: () => model.deleteState(state.key) },
			],
		};
	}
</script>

<section class='states-panel'>
	<header>
		<span class='title'>{game.i18n.localize('splash.editor.statesPanel.title')}</span>
		<IconButton icon='fa-solid fa-plus' title={game.i18n.localize('splash.editor.statesPanel.addState')} onclick={() => model.addState()} />
	</header>

	<div class='list'>
		{#each model.states as state (state.key)}
			<div
				class='row'
				class:active={state.key === model.activeState}
				role='button'
				tabindex='0'
				onclick={() => model.setActiveState(state.key)}
				onkeydown={e => (e.key === 'Enter' || e.key === ' ') && model.setActiveState(state.key)}
				oncontextmenu={e => openRowMenu(e, state)}
			>
				<i class='fa-solid fa-clapperboard'></i>
				<span class='name'>{state.label}</span>
				{#if state.isInitial}<i class='fa-solid fa-flag initial' title={game.i18n.localize('splash.editor.statesPanel.initialState')}></i>{/if}
			</div>
		{/each}
	</div>
</section>

{#if rowMenu}
	<ContextMenu x={rowMenu.x} y={rowMenu.y} items={rowMenu.items} onClose={() => (rowMenu = null)} />
{/if}

<style lang='scss'>
	.states-panel {
		display: flex;
		flex-direction: column;
		min-height: 0;

		header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 6px 8px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);

			.title {
				font-size: 12px;
				font-weight: 600;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				opacity: 0.7;
			}
		}

		.list {
			overflow-y: auto;
			padding: 4px;
			display: flex;
			flex-direction: column;
			gap: 2px;
		}

		.row {
			display: grid;
			grid-template-columns: 18px 1fr auto;
			align-items: center;
			gap: 8px;
			height: 30px;
			padding: 0 6px;
			border: 1px solid transparent;
			border-radius: 4px;
			cursor: pointer;

			&:hover {
				background: rgba(255, 255, 255, 0.05);
			}

			&.active {
				background: rgba(255, 144, 0, 0.18);
				border-color: rgba(255, 144, 0, 0.5);
			}

			.name {
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				font-size: 12px;
			}

			.initial {
				font-size: 10px;
				color: #ff9800;
			}
		}
	}
</style>
