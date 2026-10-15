<svelte:options runes={true} />
<script lang='ts'>
	import type { ButtonSpriteCreate, DraggableSpriteCreate, DropZoneSpriteCreate, GaugeSpriteCreate, HotspotSpriteCreate, SpriteCreate, TextInputSpriteCreate, VideoSpriteCreate } from '../../datamodel/SplashModel.ts';
	import { CheckboxField, NumberField, TextField } from '../ui';
	import ActionEditor from './ActionEditor.svelte';
	import MacroContextEditor from './MacroContextEditor.svelte';

	const { sprite, states, valueKeys, stateLabels, onChange, onReplace }: {
		sprite: SpriteCreate;
		states: string[];
		valueKeys: string[];
		stateLabels: Record<string, string>;
		onChange: (patch: Record<string, unknown>) => void;
		onReplace: (key: string, value: unknown) => void;
	} = $props();
</script>

<div class='behaviour'>
	{#if sprite.type === 'button'}
		{@const btn = sprite as ButtonSpriteCreate}
		<h3>{game.i18n.localize('splash.editor.objectTab.onClick')}</h3>
		<ActionEditor action={btn.onClick} {states} {valueKeys} {stateLabels} onChange={a => onReplace('onClick', a)} />
		<details>
			<summary>{game.i18n.localize('splash.editor.inspector.advanced')}</summary>
			<MacroContextEditor value={btn.context ?? {}} onChange={v => onReplace('context', v)} />
		</details>
	{:else if sprite.type === 'hotspot'}
		{@const hotspot = sprite as HotspotSpriteCreate}
		<h3>{game.i18n.localize('splash.editor.objectTab.onClick')}</h3>
		<ActionEditor action={hotspot.onClick} {states} {valueKeys} {stateLabels} onChange={a => onReplace('onClick', a)} />
	{:else if sprite.type === 'drop-zone'}
		{@const zone = sprite as DropZoneSpriteCreate}
		<TextField label={game.i18n.localize('splash.editor.objectTab.accepts')} value={zone.accepts ?? ''} onChange={v => onChange({ accepts: v })} />
		<h3>{game.i18n.localize('splash.editor.objectTab.onDrop')}</h3>
		<ActionEditor action={zone.onDrop} {states} {valueKeys} {stateLabels} onChange={a => onReplace('onDrop', a)} />
	{:else if sprite.type === 'gauge'}
		{@const gauge = sprite as GaugeSpriteCreate}
		<TextField suggestions={valueKeys} hint={game.i18n.localize('splash.editor.inspector.valueHint')} label={game.i18n.localize('splash.editor.objectTab.valueKey')} value={gauge.valueKey ?? ''} onChange={v => onChange({ valueKey: v })} />
		<div class='grid'>
			<NumberField label={game.i18n.localize('splash.editor.objectTab.min')} value={gauge.min ?? 0} onChange={v => onChange({ min: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.max')} value={gauge.max ?? 100} onChange={v => onChange({ max: v })} />
		</div>

		<CheckboxField label={game.i18n.localize('splash.editor.objectTab.vertical')} value={gauge.vertical ?? false} onChange={v => onChange({ vertical: v })} />
	{:else if sprite.type === 'text-input'}
		{@const textInput = sprite as TextInputSpriteCreate}
		<TextField suggestions={valueKeys} hint={game.i18n.localize('splash.editor.inspector.valueHint')} label={game.i18n.localize('splash.editor.objectTab.valueKey')} value={textInput.valueKey ?? ''} onChange={v => onChange({ valueKey: v })} />
	{:else if sprite.type === 'draggable'}
		{@const drag = sprite as DraggableSpriteCreate}
		<TextField suggestions={valueKeys} hint={game.i18n.localize('splash.editor.inspector.valueHint')} label={game.i18n.localize('splash.editor.objectTab.valueKey')} value={drag.valueKey ?? ''} onChange={v => onChange({ valueKey: v })} />
		<TextField label={game.i18n.localize('splash.editor.objectTab.tag')} value={drag.tag ?? ''} onChange={v => onChange({ tag: v })} />
	{:else if sprite.type === 'video'}
		{@const video = sprite as VideoSpriteCreate}
		<CheckboxField label={game.i18n.localize('splash.editor.objectTab.loop')} value={video.loop ?? true} onChange={v => onChange({ loop: v })} />
		<CheckboxField label={game.i18n.localize('splash.editor.objectTab.muted')} value={video.muted ?? true} onChange={v => onChange({ muted: v })} />
		<CheckboxField label={game.i18n.localize('splash.editor.objectTab.autoplay')} value={video.autoplay ?? true} onChange={v => onChange({ autoplay: v })} />
	{:else}
		<p class='hint'>{game.i18n.localize('splash.editor.inspector.noBehaviour')}</p>
	{/if}
</div>
<style lang='scss'>
	.behaviour {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	h3 {
		margin: 0;
		font-size: 13px;
	}
	.hint {
		font-size: 12px;
		color: #bbb;
	}
	details {
		margin-top: 12px;
		border-top: 1px solid #ffffff18;
		padding-top: 12px;
	}
	summary {
		cursor: pointer;
		font-size: 12px;
	}
</style>
