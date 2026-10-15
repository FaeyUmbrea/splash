<svelte:options runes={true} />
<script lang='ts'>
	import type { ButtonSpriteCreate, DraggableSpriteCreate, DropZoneSpriteCreate, GaugeSpriteCreate, ImageSpriteCreate, PanelSpriteCreate, SpriteCreate, TextInputSpriteCreate, TextSpriteCreate, VideoSpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { SelectItem } from '../ui';
	import { ColorField, Field, ImageField, NumberField, Select, TextField } from '../ui';
	import AnimationEditor from './AnimationEditor.svelte';
	import EffectsEditor from './EffectsEditor.svelte';
	import NineSliceEditor from './NineSliceEditor.svelte';

	const { sprite, stageWidth, onChange, onReplace }: {
		sprite: SpriteCreate;
		stageWidth: number;
		onChange: (patch: Record<string, unknown>) => void;
		onReplace: (key: string, value: unknown) => void;
	} = $props();

	const alignOptions: SelectItem[] = [
		{ value: 'left', label: game.i18n.localize('splash.editor.objectTab.alignLeft') },
		{ value: 'center', label: game.i18n.localize('splash.editor.objectTab.alignCenter') },
		{ value: 'right', label: game.i18n.localize('splash.editor.objectTab.alignRight') },
		{ value: 'justify', label: game.i18n.localize('splash.editor.objectTab.alignJustify') },
	];
	let nineSlice = $state<{ key: 'image' | 'hoverImage' | 'clickImage'; title: string } | null>(null);

	/** Create an empty nine-slice image for a button interaction variant. */
	function blankImage() {
		return { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 };
	}
</script>

<div class='appearance'>
	{#if sprite.type === 'image'}
		{@const img = sprite as ImageSpriteCreate}
		<ImageField label={game.i18n.localize('splash.editor.objectTab.image')} value={img.img ?? ''} onChange={v => onChange({ img: v })} />
	{:else if sprite.type === 'text'}
		{@const text = sprite as TextSpriteCreate}
		<TextField label={game.i18n.localize('splash.editor.objectTab.text')} value={text.text ?? ''} onChange={v => onChange({ text: v })} />
		<TextField label={game.i18n.localize('splash.editor.objectTab.font')} value={text.font ?? 'Arial'} onChange={v => onChange({ font: v })} />
		<NumberField label={game.i18n.localize('splash.editor.objectTab.size')} value={text.size ?? 34} onChange={v => onChange({ size: v })} />
		<ColorField label={game.i18n.localize('splash.editor.objectTab.color')} value={text.fillColor ?? '#ffffff'} onChange={v => onChange({ fillColor: v })} />
		<Field label={game.i18n.localize('splash.editor.objectTab.align')}>
			<Select options={alignOptions} value={text.align ?? 'center'} searchable={false} onChange={v => onChange({ align: v })} />
		</Field>
	{:else if sprite.type === 'button'}
		{@const btn = sprite as ButtonSpriteCreate}
		<TextField label={game.i18n.localize('splash.editor.objectTab.label')} value={btn.label?.text ?? ''} onChange={v => onChange({ label: { text: v } })} />
		<NumberField label={game.i18n.localize('splash.editor.objectTab.labelSize')} value={btn.label?.fontSize ?? 20} onChange={v => onChange({ label: { fontSize: v } })} />
		<ColorField label={game.i18n.localize('splash.editor.objectTab.labelColor')} value={btn.label?.fill ?? '#000000'} onChange={v => onChange({ label: { fill: v } })} />

		<ImageField label={game.i18n.localize('splash.editor.objectTab.image')} value={btn.image?.url ?? ''} onChange={url => onChange({ image: { url } })} />
		<details>
			<summary>{game.i18n.localize('splash.editor.inspector.artworkVariants')}</summary>
			<div class='images'>
				<span class='sublabel'>{game.i18n.localize('splash.editor.objectTab.buttonImages')}</span>
				<button type='button' class='slice-btn' onclick={() => (nineSlice = { key: 'image', title: game.i18n.localize('splash.editor.objectTab.image') })}>
					<i class='fa-solid fa-table-cells-large'></i> {game.i18n.localize('splash.editor.objectTab.editImage')}
				</button>
				{#each [['hoverImage', game.i18n.localize('splash.editor.objectTab.hover'), game.i18n.localize('splash.editor.objectTab.editHoverImage'), game.i18n.localize('splash.editor.objectTab.addHoverImage')], ['clickImage', game.i18n.localize('splash.editor.objectTab.click'), game.i18n.localize('splash.editor.objectTab.editClickImage'), game.i18n.localize('splash.editor.objectTab.addClickImage')]] as [key, title, editLabel, addLabel] (key)}
					{@const present = !!(btn as Record<string, unknown>)[key]}
					<div class='variant'>
						{#if present}
							<button type='button' class='slice-btn' onclick={() => (nineSlice = { key: key as 'hoverImage', title })}>
								<i class='fa-solid fa-table-cells-large'></i> {editLabel}
							</button>
							<button type='button' class='x' title={game.i18n.localize('splash.editor.objectTab.remove')} aria-label={game.i18n.localize('splash.editor.objectTab.remove')} onclick={() => onReplace(key, null)}><i class='fa-solid fa-trash'></i></button>
						{:else}
							<button type='button' class='slice-btn ghost' onclick={() => onReplace(key, blankImage())}>
								<i class='fa-solid fa-plus'></i> {addLabel}
							</button>
						{/if}
					</div>
				{/each}
			</div>

		</details>

	{:else if sprite.type === 'panel'}
		{@const panel = sprite as PanelSpriteCreate}
		<ColorField label={game.i18n.localize('splash.editor.objectTab.fill')} value={panel.fill ?? '#222831'} onChange={v => onChange({ fill: v })} />
		<div class='grid'>
			<ColorField label={game.i18n.localize('splash.editor.objectTab.borderColor')} value={panel.borderColor ?? '#000000'} onChange={v => onChange({ borderColor: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.borderWidth')} value={panel.borderWidth ?? 0} min={0} onChange={v => onChange({ borderWidth: v })} />
		</div>
		<NumberField label={game.i18n.localize('splash.editor.objectTab.cornerRadius')} value={panel.radius ?? 0} min={0} onChange={v => onChange({ radius: v })} />
	{:else if sprite.type === 'gauge'}
		{@const gauge = sprite as GaugeSpriteCreate}
		<div class='grid'>
			<ColorField label={game.i18n.localize('splash.editor.objectTab.fillColor')} value={gauge.fillColor ?? '#4caf50'} onChange={v => onChange({ fillColor: v })} />
			<ColorField label={game.i18n.localize('splash.editor.objectTab.bgColor')} value={gauge.bgColor ?? '#222831'} onChange={v => onChange({ bgColor: v })} />
		</div>
	{:else if sprite.type === 'hotspot'}
		<p class='hint'>{game.i18n.localize('splash.editor.inspector.hotspotAppearance')}</p>

	{:else if sprite.type === 'video'}
		{@const video = sprite as VideoSpriteCreate}
		<ImageField label={game.i18n.localize('splash.editor.objectTab.videoSource')} value={video.src ?? ''} onChange={v => onChange({ src: v })} />
	{:else if sprite.type === 'text-input'}
		{@const textInput = sprite as TextInputSpriteCreate}
		<TextField label={game.i18n.localize('splash.editor.objectTab.placeholder')} value={textInput.placeholder ?? ''} onChange={v => onChange({ placeholder: v })} />
		<NumberField label={game.i18n.localize('splash.editor.objectTab.fontSize')} value={textInput.fontSize ?? 18} onChange={v => onChange({ fontSize: v })} />
		<div class='grid'>
			<ColorField label={game.i18n.localize('splash.editor.objectTab.color')} value={textInput.color ?? '#ffffff'} onChange={v => onChange({ color: v })} />
			<ColorField label={game.i18n.localize('splash.editor.objectTab.bgColor')} value={textInput.bgColor ?? '#1b1b1e'} onChange={v => onChange({ bgColor: v })} />
		</div>
	{:else if sprite.type === 'draggable'}
		{@const drag = sprite as DraggableSpriteCreate}
		<ImageField label={game.i18n.localize('splash.editor.objectTab.image')} value={drag.img ?? ''} onChange={v => onChange({ img: v })} />
		<div class='grid'>
			<ColorField label={game.i18n.localize('splash.editor.objectTab.fill')} value={drag.fill ?? ''} onChange={v => onChange({ fill: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.cornerRadius')} value={drag.radius ?? 0} min={0} onChange={v => onChange({ radius: v })} />
		</div>
	{:else if sprite.type === 'drop-zone'}
		{@const zone = sprite as DropZoneSpriteCreate}
		<ColorField label={game.i18n.localize('splash.editor.objectTab.fill')} value={zone.fill ?? '#22283155'} onChange={v => onChange({ fill: v })} />
		<div class='grid'>
			<ColorField label={game.i18n.localize('splash.editor.objectTab.borderColor')} value={zone.borderColor ?? '#ffffff'} onChange={v => onChange({ borderColor: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.borderWidth')} value={zone.borderWidth ?? 2} min={0} onChange={v => onChange({ borderWidth: v })} />
		</div>
		<div class='grid'>
			<ColorField label={game.i18n.localize('splash.editor.objectTab.highlightColor')} value={zone.highlightColor ?? '#4caf50'} onChange={v => onChange({ highlightColor: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.cornerRadius')} value={zone.radius ?? 8} min={0} onChange={v => onChange({ radius: v })} />
		</div>

	{/if}

	<details>
		<summary>{game.i18n.localize('splash.editor.inspector.motion')}</summary>
		<div class='subsection'>
			<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.animationIn')} width={stageWidth} value={sprite.animIn} onChange={a => onReplace('animIn', a)} />
			<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.animationOut')} width={stageWidth} value={sprite.animOut} onChange={a => onReplace('animOut', a)} />
		</div>

		<div class='subsection'>
			<EffectsEditor effects={(sprite.effects as Record<string, unknown>[]) ?? []} onChange={e => onReplace('effects', e)} />
		</div>

	</details>
</div>
{#if nineSlice}
	{@const btn = sprite as ButtonSpriteCreate}
	<NineSliceEditor
		title={nineSlice.title}
		value={((btn as Record<string, unknown>)[nineSlice.key] as Record<string, unknown>) ?? blankImage()}
		onChange={patch => onChange({ [nineSlice.key]: patch })}
		onClose={() => (nineSlice = null)}
	/>
{/if}

<style lang='scss'>
	.appearance, .images, .subsection {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.variant, .grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.variant {
		grid-template-columns: 1fr 30px;
	}
	.subsection {
		padding-top: 12px;
		border-top: 1px solid #ffffff18;
	}
	.sublabel, .hint {
		font-size: 12px;
		color: #bbb;
	}
	.slice-btn, .x {
		min-height: 32px;
		color: inherit;
		background: #ffffff08;
		border: 1px solid #ffffff26;
		border-radius: 4px;
		cursor: pointer;
	}
	.slice-btn:hover, .x:hover {
		border-color: #ff900080;
	}
	details {
		border-top: 1px solid #ffffff18;
		padding-top: 12px;
	}
	summary {
		cursor: pointer;
		font-size: 12px;
	}
	.images {
		margin-top: 12px;
	}
	.ghost {
		opacity: 0.8;
	}
</style>
