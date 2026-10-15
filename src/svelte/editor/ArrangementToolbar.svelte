<svelte:options runes={true} />
<script lang='ts'>
	import type { EditorModel } from './editorModel.svelte.ts';
	import type { Alignment } from './selectionGeometry.ts';

	const { model }: { model: EditorModel } = $props();
	const hasPlacement = $derived(model.selectedObjects.some(object => object.inState));
	const alignments: Alignment[] = ['left', 'center', 'right', 'top', 'middle', 'bottom'];
	/** Apply one alignment command, then return the menu to its prompt. */
	function align(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		model.alignSelection(select.value as Alignment);
		select.value = '';
	}

	/** Change selected objects' layer order, then return the menu to its prompt. */
	function layer(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		model.layerSelection(select.value as 'front' | 'back');
		select.value = '';
	}
</script>

<div class='arrangement' role='group' aria-label={game.i18n.localize('splash.editor.arrangement.title')}>
	<button type='button' disabled={!model.selectedIds.length} onclick={() => model.duplicateObjects(model.selectedIds)}><i class='fa-solid fa-clone'></i> {game.i18n.localize('splash.editor.objectsPanel.duplicate')}</button>
	<button type='button' disabled={model.selectedIds.length < 2 && !model.selectionGrouped} onclick={() => model.selectionGrouped ? model.ungroup() : model.group()}><i class={model.selectionGrouped ? 'fa-solid fa-object-ungroup' : 'fa-solid fa-object-group'}></i> {game.i18n.localize(model.selectionGrouped ? 'splash.editor.objectsPanel.ungroup' : 'splash.editor.arrangement.group')}</button>
	<label>
		<span>{game.i18n.localize('splash.editor.arrangement.align')}</span>
		<select disabled={!hasPlacement} value='' onchange={align}>
			<option value='' disabled>{game.i18n.localize('splash.editor.arrangement.chooseAlignment')}</option>
			{#each alignments as alignment (alignment)}<option value={alignment}>{game.i18n.localize(`splash.editor.arrangement.${alignment}`)}</option>{/each}
		</select>
	</label>
	<label>
		<span>{game.i18n.localize('splash.editor.arrangement.layer')}</span>
		<select disabled={!hasPlacement} value='' onchange={layer}>
			<option value='' disabled>{game.i18n.localize('splash.editor.arrangement.chooseLayer')}</option>
			<option value='front'>{game.i18n.localize('splash.editor.canvasFrame.bringToFront')}</option>
			<option value='back'>{game.i18n.localize('splash.editor.canvasFrame.sendToBack')}</option>
		</select>
	</label>
</div>

<style lang='scss'>
	.arrangement {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	button, select {
		width: auto;
		min-height: 32px;
		color: inherit;
		background: #ffffff05;
		border: 1px solid #ffffff26;
		border-radius: 4px;
		font-size: 12px;
	}
	button {
		padding: 0 10px;
		cursor: pointer;
	}
	button:disabled, select:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}
</style>
