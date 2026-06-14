<svelte:options runes={true} />
<script lang='ts'>
	import type { ButtonSpriteCreate, ImageSpriteCreate, TextSpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { SelectItem } from '../ui';
	import type { DocumentStore } from './documentStore.svelte.ts';
	import { ColorField, Field, ImageField, NumberField, Panel, Select, TextField } from '../ui';
	import ActionEditor from './ActionEditor.svelte';
	import AnimationEditor from './AnimationEditor.svelte';
	import ButtonImageEditor from './ButtonImageEditor.svelte';
	import { replacePlacementField, replaceSpriteField, updatePlacement, updateSprite } from './edit.ts';
	import EffectsEditor from './EffectsEditor.svelte';

	function blankImage() {
		return { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 };
	}

	const {
		store,
		selectedId,
		activeState,
	}: {
		store: DocumentStore;
		selectedId: string;
		activeState: string;
	} = $props();

	const children = $derived(store.data.children ?? []);
	const sprite = $derived(children.find(c => c.id === selectedId));
	const placement = $derived(sprite?.states?.[activeState]);

	const alignOptions: SelectItem[] = [
		{ value: 'left', label: 'Left' },
		{ value: 'center', label: 'Center' },
		{ value: 'right', label: 'Right' },
		{ value: 'justify', label: 'Justify' },
	];

	function setSprite(patch: Record<string, unknown>) {
		if (sprite) void updateSprite(store.page, children, sprite.id ?? '', patch);
	}
	function setPlace(patch: Record<string, unknown>) {
		if (sprite) void updatePlacement(store.page, children, sprite.id ?? '', activeState, patch);
	}
</script>

{#if sprite}
	<Panel title='{sprite.type} sprite'>
		<div class='inspector'>
			<TextField label='Name' value={sprite.name ?? ''} onChange={v => setSprite({ name: v })} />

			{#if sprite.type === 'image'}
				{@const img = sprite as ImageSpriteCreate}
				<ImageField label='Image' value={img.img ?? ''} onChange={v => setSprite({ img: v })} />
			{:else if sprite.type === 'text'}
				{@const text = sprite as TextSpriteCreate}
				<TextField label='Text' value={text.text ?? ''} onChange={v => setSprite({ text: v })} />
				<TextField label='Font' value={text.font ?? 'Arial'} onChange={v => setSprite({ font: v })} />
				<NumberField label='Size' value={text.size ?? 34} onChange={v => setSprite({ size: v })} />
				<ColorField label='Color' value={text.fillColor ?? '#ffffff'} onChange={v => setSprite({ fillColor: v })} />
				<Field label='Align'>
					<Select options={alignOptions} value={text.align ?? 'center'} searchable={false} onChange={v => setSprite({ align: v })} />
				</Field>
			{:else if sprite.type === 'button'}
				{@const btn = sprite as ButtonSpriteCreate}
				<TextField label='Label' value={btn.label?.text ?? ''} onChange={v => setSprite({ label: { text: v } })} />
				<NumberField label='Label size' value={btn.label?.fontSize ?? 20} onChange={v => setSprite({ label: { fontSize: v } })} />
				<ColorField label='Label color' value={btn.label?.fill ?? '#ffffff'} onChange={v => setSprite({ label: { fill: v } })} />
				<div class='grid'>
					<ColorField label='Tint' value={btn.tint ?? '#ffffff'} onChange={v => setSprite({ tint: v })} />
					<ColorField label='Hover' value={btn.hoverTint ?? '#ffffff'} onChange={v => setSprite({ hoverTint: v })} />
					<ColorField label='Click' value={btn.clickTint ?? '#ffffff'} onChange={v => setSprite({ clickTint: v })} />
				</div>
				<ButtonImageEditor label='Image' value={btn.image} onPatch={p => setSprite({ image: p })} />
				<ButtonImageEditor
					label='Hover image' optional value={btn.hoverImage}
					onPatch={p => setSprite({ hoverImage: p })}
					onEnable={() => replaceSpriteField(store.page, children, sprite?.id ?? '', 'hoverImage', blankImage())}
					onRemove={() => replaceSpriteField(store.page, children, sprite?.id ?? '', 'hoverImage', null)}
				/>
				<ButtonImageEditor
					label='Click image' optional value={btn.clickImage}
					onPatch={p => setSprite({ clickImage: p })}
					onEnable={() => replaceSpriteField(store.page, children, sprite?.id ?? '', 'clickImage', blankImage())}
					onRemove={() => replaceSpriteField(store.page, children, sprite?.id ?? '', 'clickImage', null)}
				/>
				<div class='subsection'>
					<span class='sublabel'>On click</span>
					<ActionEditor
						action={btn.onClick}
						states={Object.keys(store.data.states ?? {})}
						onChange={a => sprite && replaceSpriteField(store.page, children, sprite.id ?? '', 'onClick', a)}
					/>
				</div>
			{/if}

			<div class='subsection'>
				<AnimationEditor label='Sprite animation in' value={sprite.animIn} onChange={a => replaceSpriteField(store.page, children, sprite?.id ?? '', 'animIn', a)} />
				<AnimationEditor label='Sprite animation out' value={sprite.animOut} onChange={a => replaceSpriteField(store.page, children, sprite?.id ?? '', 'animOut', a)} />
			</div>

			<div class='subsection'>
				<EffectsEditor effects={(sprite.effects as Record<string, unknown>[]) ?? []} onChange={e => replaceSpriteField(store.page, children, sprite?.id ?? '', 'effects', e)} />
			</div>

			{#if placement}
				<h3>Placement ({activeState})</h3>
				<div class='grid'>
					<NumberField label='X' value={placement.x ?? 0} onChange={v => setPlace({ x: v })} />
					<NumberField label='Y' value={placement.y ?? 0} onChange={v => setPlace({ y: v })} />
					<NumberField label='W' value={placement.width ?? null} onChange={v => setPlace({ width: v })} />
					<NumberField label='H' value={placement.height ?? null} onChange={v => setPlace({ height: v })} />
					<NumberField label='Z' value={placement.zIndex ?? 0} onChange={v => setPlace({ zIndex: v })} />
				</div>
				<AnimationEditor label='State animation in' value={placement.animIn} onChange={a => sprite && replacePlacementField(store.page, children, sprite.id ?? '', activeState, 'animIn', a)} />
				<AnimationEditor label='State animation out' value={placement.animOut} onChange={a => sprite && replacePlacementField(store.page, children, sprite.id ?? '', activeState, 'animOut', a)} />
			{:else}
				<p class='hint'>Not placed in "{activeState}".</p>
			{/if}
		</div>
	</Panel>
{/if}

<style lang='scss'>
	.inspector {
		display: flex;
		flex-direction: column;
		gap: 8px;

		h3 {
			margin: 4px 0 0;
			font-size: 12px;
			text-transform: uppercase;
			letter-spacing: 0.4px;
			opacity: 0.7;
			border: none;
		}

		.grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}

		.hint {
			margin: 0;
			font-size: 11px;
			opacity: 0.55;
		}

		.subsection {
			display: flex;
			flex-direction: column;
			gap: 6px;
			padding-top: 6px;
			border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		}

		.sublabel {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.4px;
			opacity: 0.6;
		}
	}
</style>
