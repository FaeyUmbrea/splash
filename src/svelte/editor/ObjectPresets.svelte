<svelte:options runes={true} />
<script lang='ts'>
	import type { ButtonSpriteCreate, SpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { PresetPayload } from '../../utils/presets.ts';
	import { buttonSpriteToPreset, promptAndSavePreset } from '../../utils/presets.ts';
	import PresetPicker from '../presets/PresetPicker.svelte';

	const { sprite, name, onSprite, onButton }: {
		sprite: SpriteCreate;
		name: string;
		onSprite: (sprite: SpriteCreate) => void;
		onButton: (payload: Record<string, unknown>) => void;
	} = $props();
	const isGM = !!game.user?.isGM;
	let spritePicking = $state(false);
	let buttonPicking = $state(false);
	/** Apply a selected sprite preset through the editor's preset operation. */
	function applySpritePreset(payload: PresetPayload) {
		if (payload.type === 'sprite') onSprite(payload.value);
	}
	/** Apply button artwork while retaining the selected button's action. */
	function applyButtonPreset(payload: PresetPayload) {
		if (payload.type === 'button') onButton(payload as unknown as Record<string, unknown>);
	}
</script>
<details>
	<summary>{game.i18n.localize('splash.editor.inspector.presets')}</summary>
	<div class='preset-bar'>
		<button type='button' class='preset-btn' onclick={() => (spritePicking = true)}><i class='fa-solid fa-folder-open'></i> {game.i18n.localize('splash.editor.objectTab.applySpritePreset')}</button>
		{#if isGM}
			<button type='button' class='preset-btn' onclick={() => promptAndSavePreset({ type: 'sprite', value: sprite }, name)}><i class='fa-solid fa-floppy-disk'></i> {game.i18n.localize('splash.editor.objectTab.saveSpritePreset')}</button>
		{/if}
	</div>

	{#if sprite.type === 'button'}
		<div class='preset-bar'>
			<button type='button' class='preset-btn' onclick={() => (buttonPicking = true)}><i class='fa-solid fa-folder-open'></i> {game.i18n.localize('splash.editor.objectTab.applyButtonPreset')}</button>
			{#if isGM}
				<button type='button' class='preset-btn' onclick={() => promptAndSavePreset(buttonSpriteToPreset(sprite as ButtonSpriteCreate), name)}><i class='fa-solid fa-floppy-disk'></i> {game.i18n.localize('splash.editor.objectTab.saveAsPreset')}</button>
			{/if}
		</div>
	{/if}
</details>
{#if buttonPicking}
	<PresetPicker kind='button' title={game.i18n.localize('splash.editor.objectTab.applyButtonPreset')} onPick={applyButtonPreset} onClose={() => (buttonPicking = false)} />
{/if}
{#if spritePicking}
	<PresetPicker kind='sprite' title={game.i18n.localize('splash.editor.objectTab.applySpritePreset')} onPick={applySpritePreset} onClose={() => (spritePicking = false)} />
{/if}
<style lang='scss'>
	details {
		border-top: 1px solid #ffffff18;
		padding-top: 12px;
	}
	summary {
		cursor: pointer;
		font-size: 12px;
	}
	.preset-bar {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 8px;
	}
	.preset-btn {
		min-height: 32px;
		color: inherit;
		border: 1px solid #ffffff26;
		background: #ffffff08;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
	}
</style>
