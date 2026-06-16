<svelte:options runes={true} />
<script lang='ts'>
	import type { ButtonSpriteCreate, DraggableSpriteCreate, DropZoneSpriteCreate, GaugeSpriteCreate, HotspotSpriteCreate, ImageSpriteCreate, PanelSpriteCreate, SpriteCreate, TextInputSpriteCreate, TextSpriteCreate, VideoSpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { PresetPayload } from '../../utils/presets.ts';
	import type { SelectItem } from '../ui';
	import type { EditorModel } from './editorModel.svelte.ts';
	import { buttonSpriteToPreset, promptAndSavePreset } from '../../utils/presets.ts';
	import PresetPicker from '../presets/PresetPicker.svelte';
	import { CheckboxField, ColorField, Field, ImageField, NumberField, Select, TextField } from '../ui';
	import ActionEditor from './ActionEditor.svelte';
	import AnimationEditor from './AnimationEditor.svelte';
	import EffectsEditor from './EffectsEditor.svelte';
	import NineSliceEditor from './NineSliceEditor.svelte';

	const { model }: { model: EditorModel } = $props();

	const obj = $derived(model.selected);
	const states = $derived(model.states.map(s => s.key));

	const alignOptions: SelectItem[] = [
		{ value: 'left', label: game.i18n.localize('splash.editor.objectTab.alignLeft') },
		{ value: 'center', label: game.i18n.localize('splash.editor.objectTab.alignCenter') },
		{ value: 'right', label: game.i18n.localize('splash.editor.objectTab.alignRight') },
		{ value: 'justify', label: game.i18n.localize('splash.editor.objectTab.alignJustify') },
	];

	let nineSlice = $state<{ key: 'image' | 'hoverImage' | 'clickImage'; title: string } | null>(null);
	let buttonPicking = $state(false);
	let spritePicking = $state(false);
	const isGM = !!game.user?.isGM;

	function blankImage() {
		return { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 };
	}

	function setContent(patch: Record<string, unknown>) {
		if (obj) model.setObjectContent(obj.id, patch);
	}
	function setPlace(patch: Record<string, unknown>) {
		if (obj) model.setPlacement(obj.id, patch);
	}

	function applyButtonPreset(payload: PresetPayload) {
		if (obj && payload.type === 'button') model.applyButtonPreset(obj.id, payload as unknown as Record<string, unknown>);
	}
	function applySpritePreset(payload: PresetPayload) {
		if (payload.type === 'sprite') model.applySpritePreset(payload.value);
	}

	// --- macro context editor (free-form per-button data) --------------------
	const ctxData = $derived(((obj?.raw as { context?: Record<string, unknown> })?.context) ?? {});
	let newContextKey = $state('');

	/** Parse a typed value from text: JSON where possible (numbers, arrays, booleans), else a raw string. */
	function parseContext(raw: string): unknown {
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}
	function displayContext(value: unknown): string {
		return typeof value === 'string' ? value : JSON.stringify(value);
	}
	function setContext(key: string, value: unknown) {
		if (obj) model.replaceObjectField(obj.id, 'context', { ...ctxData, [key]: value });
	}
	function removeContext(key: string) {
		const next = { ...ctxData };
		delete next[key];
		if (obj) model.replaceObjectField(obj.id, 'context', next);
	}
	function addContext() {
		const key = newContextKey.trim();
		if (!key || !obj) return;
		setContext(key, '');
		newContextKey = '';
	}
</script>

{#if model.selectedIds.length > 1}
	<div class='empty'>{game.i18n.format('splash.editor.objectTab.multiSelected', { count: model.selectedIds.length })}</div>
{:else if !obj}
	<div class='empty'>{game.i18n.localize('splash.editor.objectTab.noSelection')}</div>
{:else}
	{@const raw = obj.raw}
	<div class='object-tab'>
		<TextField label={game.i18n.localize('splash.editor.objectTab.name')} value={raw.name ?? ''} placeholder={obj.name} onChange={v => setContent({ name: v })} />

		<div class='preset-bar'>
			<button type='button' class='preset-btn' onclick={() => (spritePicking = true)}><i class='fa-solid fa-folder-open'></i> {game.i18n.localize('splash.editor.objectTab.applySpritePreset')}</button>
			{#if isGM}
				<button type='button' class='preset-btn' onclick={() => promptAndSavePreset({ type: 'sprite', value: raw as SpriteCreate }, raw.name || obj.name)}><i class='fa-solid fa-floppy-disk'></i> {game.i18n.localize('splash.editor.objectTab.saveSpritePreset')}</button>
			{/if}
		</div>

		{#if obj.type === 'image'}
			{@const img = raw as ImageSpriteCreate}
			<ImageField label={game.i18n.localize('splash.editor.objectTab.image')} value={img.img ?? ''} onChange={v => setContent({ img: v })} />
		{:else if obj.type === 'text'}
			{@const text = raw as TextSpriteCreate}
			<TextField label={game.i18n.localize('splash.editor.objectTab.text')} value={text.text ?? ''} onChange={v => setContent({ text: v })} />
			<TextField label={game.i18n.localize('splash.editor.objectTab.font')} value={text.font ?? 'Arial'} onChange={v => setContent({ font: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.size')} value={text.size ?? 34} onChange={v => setContent({ size: v })} />
			<ColorField label={game.i18n.localize('splash.editor.objectTab.color')} value={text.fillColor ?? '#ffffff'} onChange={v => setContent({ fillColor: v })} />
			<Field label={game.i18n.localize('splash.editor.objectTab.align')}>
				<Select options={alignOptions} value={text.align ?? 'center'} searchable={false} onChange={v => setContent({ align: v })} />
			</Field>
		{:else if obj.type === 'button'}
			{@const btn = raw as ButtonSpriteCreate}
			<TextField label={game.i18n.localize('splash.editor.objectTab.label')} value={btn.label?.text ?? ''} onChange={v => setContent({ label: { text: v } })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.labelSize')} value={btn.label?.fontSize ?? 20} onChange={v => setContent({ label: { fontSize: v } })} />
			<ColorField label={game.i18n.localize('splash.editor.objectTab.labelColor')} value={btn.label?.fill ?? '#ffffff'} onChange={v => setContent({ label: { fill: v } })} />

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
							<button type='button' class='x' title={game.i18n.localize('splash.editor.objectTab.remove')} aria-label={game.i18n.localize('splash.editor.objectTab.remove')} onclick={() => model.replaceObjectField(obj.id, key, null)}><i class='fa-solid fa-trash'></i></button>
						{:else}
							<button type='button' class='slice-btn ghost' onclick={() => model.replaceObjectField(obj.id, key, blankImage())}>
								<i class='fa-solid fa-plus'></i> {addLabel}
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<div class='subsection'>
				<span class='sublabel'>{game.i18n.localize('splash.editor.objectTab.onClick')}</span>
				<ActionEditor action={btn.onClick} {states} onChange={a => model.replaceObjectField(obj.id, 'onClick', a)} />
			</div>

			<div class='subsection'>
				<span class='sublabel'>{game.i18n.localize('splash.editor.objectTab.macroContext')}</span>
				{#each Object.entries(ctxData) as [key, value] (key)}
					<div class='ctx-row'>
						<span class='ctx-key' title={key}>{key}</span>
						<TextField value={displayContext(value)} onChange={v => setContext(key, parseContext(v))} />
						<button type='button' class='x' title={game.i18n.localize('splash.editor.objectTab.remove')} aria-label={game.i18n.localize('splash.editor.objectTab.remove')} onclick={() => removeContext(key)}><i class='fa-solid fa-trash'></i></button>
					</div>
				{/each}
				<div class='ctx-add'>
					<TextField bind:value={newContextKey} placeholder={game.i18n.localize('splash.editor.objectTab.contextKey')} />
					<button type='button' class='x' title={game.i18n.localize('splash.editor.objectTab.add')} aria-label={game.i18n.localize('splash.editor.objectTab.add')} onclick={addContext}><i class='fa-solid fa-plus'></i></button>
				</div>
			</div>

			<div class='preset-bar'>
				<button type='button' class='preset-btn' onclick={() => (buttonPicking = true)}><i class='fa-solid fa-folder-open'></i> {game.i18n.localize('splash.editor.objectTab.applyButtonPreset')}</button>
				{#if isGM}
					<button type='button' class='preset-btn' onclick={() => promptAndSavePreset(buttonSpriteToPreset(btn), btn.label?.text || game.i18n.localize('splash.editor.objectTab.buttonDefaultName'))}><i class='fa-solid fa-floppy-disk'></i> {game.i18n.localize('splash.editor.objectTab.saveAsPreset')}</button>
				{/if}
			</div>
		{:else if obj.type === 'panel'}
			{@const panel = raw as PanelSpriteCreate}
			<ColorField label={game.i18n.localize('splash.editor.objectTab.fill')} value={panel.fill ?? '#222831'} onChange={v => setContent({ fill: v })} />
			<div class='grid'>
				<ColorField label={game.i18n.localize('splash.editor.objectTab.borderColor')} value={panel.borderColor ?? '#000000'} onChange={v => setContent({ borderColor: v })} />
				<NumberField label={game.i18n.localize('splash.editor.objectTab.borderWidth')} value={panel.borderWidth ?? 0} min={0} onChange={v => setContent({ borderWidth: v })} />
			</div>
			<NumberField label={game.i18n.localize('splash.editor.objectTab.cornerRadius')} value={panel.radius ?? 0} min={0} onChange={v => setContent({ radius: v })} />
		{:else if obj.type === 'gauge'}
			{@const gauge = raw as GaugeSpriteCreate}
			<TextField label={game.i18n.localize('splash.editor.objectTab.valueKey')} value={gauge.valueKey ?? ''} onChange={v => setContent({ valueKey: v })} />
			<div class='grid'>
				<NumberField label={game.i18n.localize('splash.editor.objectTab.min')} value={gauge.min ?? 0} onChange={v => setContent({ min: v })} />
				<NumberField label={game.i18n.localize('splash.editor.objectTab.max')} value={gauge.max ?? 100} onChange={v => setContent({ max: v })} />
			</div>
			<div class='grid'>
				<ColorField label={game.i18n.localize('splash.editor.objectTab.fillColor')} value={gauge.fillColor ?? '#4caf50'} onChange={v => setContent({ fillColor: v })} />
				<ColorField label={game.i18n.localize('splash.editor.objectTab.bgColor')} value={gauge.bgColor ?? '#222831'} onChange={v => setContent({ bgColor: v })} />
			</div>
			<CheckboxField label={game.i18n.localize('splash.editor.objectTab.vertical')} value={gauge.vertical ?? false} onChange={v => setContent({ vertical: v })} />
		{:else if obj.type === 'hotspot'}
			{@const hotspot = raw as HotspotSpriteCreate}
			<div class='subsection'>
				<span class='sublabel'>{game.i18n.localize('splash.editor.objectTab.onClick')}</span>
				<ActionEditor action={hotspot.onClick} {states} onChange={a => model.replaceObjectField(obj.id, 'onClick', a)} />
			</div>
		{:else if obj.type === 'video'}
			{@const video = raw as VideoSpriteCreate}
			<ImageField label={game.i18n.localize('splash.editor.objectTab.videoSource')} value={video.src ?? ''} onChange={v => setContent({ src: v })} />
			<CheckboxField label={game.i18n.localize('splash.editor.objectTab.loop')} value={video.loop ?? true} onChange={v => setContent({ loop: v })} />
			<CheckboxField label={game.i18n.localize('splash.editor.objectTab.muted')} value={video.muted ?? true} onChange={v => setContent({ muted: v })} />
			<CheckboxField label={game.i18n.localize('splash.editor.objectTab.autoplay')} value={video.autoplay ?? true} onChange={v => setContent({ autoplay: v })} />
		{:else if obj.type === 'text-input'}
			{@const textInput = raw as TextInputSpriteCreate}
			<TextField label={game.i18n.localize('splash.editor.objectTab.valueKey')} value={textInput.valueKey ?? ''} onChange={v => setContent({ valueKey: v })} />
			<TextField label={game.i18n.localize('splash.editor.objectTab.placeholder')} value={textInput.placeholder ?? ''} onChange={v => setContent({ placeholder: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.fontSize')} value={textInput.fontSize ?? 18} onChange={v => setContent({ fontSize: v })} />
			<div class='grid'>
				<ColorField label={game.i18n.localize('splash.editor.objectTab.color')} value={textInput.color ?? '#ffffff'} onChange={v => setContent({ color: v })} />
				<ColorField label={game.i18n.localize('splash.editor.objectTab.bgColor')} value={textInput.bgColor ?? '#1b1b1e'} onChange={v => setContent({ bgColor: v })} />
			</div>
		{:else if obj.type === 'draggable'}
			{@const drag = raw as DraggableSpriteCreate}
			<TextField label={game.i18n.localize('splash.editor.objectTab.valueKey')} value={drag.valueKey ?? ''} onChange={v => setContent({ valueKey: v })} />
			<TextField label={game.i18n.localize('splash.editor.objectTab.tag')} value={drag.tag ?? ''} onChange={v => setContent({ tag: v })} />
			<ImageField label={game.i18n.localize('splash.editor.objectTab.image')} value={drag.img ?? ''} onChange={v => setContent({ img: v })} />
			<div class='grid'>
				<ColorField label={game.i18n.localize('splash.editor.objectTab.fill')} value={drag.fill ?? ''} onChange={v => setContent({ fill: v })} />
				<NumberField label={game.i18n.localize('splash.editor.objectTab.cornerRadius')} value={drag.radius ?? 0} min={0} onChange={v => setContent({ radius: v })} />
			</div>
		{:else if obj.type === 'drop-zone'}
			{@const zone = raw as DropZoneSpriteCreate}
			<TextField label={game.i18n.localize('splash.editor.objectTab.accepts')} value={zone.accepts ?? ''} onChange={v => setContent({ accepts: v })} />
			<ColorField label={game.i18n.localize('splash.editor.objectTab.fill')} value={zone.fill ?? '#22283155'} onChange={v => setContent({ fill: v })} />
			<div class='grid'>
				<ColorField label={game.i18n.localize('splash.editor.objectTab.borderColor')} value={zone.borderColor ?? '#ffffff'} onChange={v => setContent({ borderColor: v })} />
				<NumberField label={game.i18n.localize('splash.editor.objectTab.borderWidth')} value={zone.borderWidth ?? 2} min={0} onChange={v => setContent({ borderWidth: v })} />
			</div>
			<div class='grid'>
				<ColorField label={game.i18n.localize('splash.editor.objectTab.highlightColor')} value={zone.highlightColor ?? '#4caf50'} onChange={v => setContent({ highlightColor: v })} />
				<NumberField label={game.i18n.localize('splash.editor.objectTab.cornerRadius')} value={zone.radius ?? 8} min={0} onChange={v => setContent({ radius: v })} />
			</div>
			<div class='subsection'>
				<span class='sublabel'>{game.i18n.localize('splash.editor.objectTab.onDrop')}</span>
				<ActionEditor action={zone.onDrop} {states} onChange={a => model.replaceObjectField(obj.id, 'onDrop', a)} />
			</div>
		{/if}

		<div class='subsection'>
			<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.animationIn')} width={model.stageW} value={raw.animIn} onChange={a => model.replaceObjectField(obj.id, 'animIn', a)} />
			<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.animationOut')} width={model.stageW} value={raw.animOut} onChange={a => model.replaceObjectField(obj.id, 'animOut', a)} />
		</div>

		<div class='subsection'>
			<EffectsEditor effects={(raw.effects as Record<string, unknown>[]) ?? []} onChange={e => model.replaceObjectField(obj.id, 'effects', e)} />
		</div>

		{#if obj.inState && obj.placement}
			<div class='subsection'>
				<span class='sublabel'>{game.i18n.format('splash.editor.objectTab.placementIn', { state: model.activeState })}</span>
				<div class='grid'>
					<NumberField label={game.i18n.localize('splash.editor.objectTab.x')} value={obj.placement.x ?? 0} onChange={v => setPlace({ x: v })} />
					<NumberField label={game.i18n.localize('splash.editor.objectTab.y')} value={obj.placement.y ?? 0} onChange={v => setPlace({ y: v })} />
					<NumberField label={game.i18n.localize('splash.editor.objectTab.w')} value={obj.placement.width ?? null} onChange={v => setPlace({ width: v })} />
					<NumberField label={game.i18n.localize('splash.editor.objectTab.h')} value={obj.placement.height ?? null} onChange={v => setPlace({ height: v })} />
					<NumberField label={game.i18n.localize('splash.editor.objectTab.z')} value={obj.placement.zIndex ?? 0} onChange={v => setPlace({ zIndex: v })} />
				</div>
				<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.stateAnimationIn')} width={model.stageW} value={obj.placement.animIn} onChange={a => model.replacePlacementField(obj.id, 'animIn', a)} />
				<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.stateAnimationOut')} width={model.stageW} value={obj.placement.animOut} onChange={a => model.replacePlacementField(obj.id, 'animOut', a)} />
			</div>
		{:else}
			<button type='button' class='place' onclick={() => model.placeInState(obj.id)}>
				<i class='fa-solid fa-plus'></i> {game.i18n.format('splash.editor.objectTab.placeInState', { state: model.activeState })}
			</button>
		{/if}
	</div>

	{#if nineSlice}
		{@const btn = raw as ButtonSpriteCreate}
		<NineSliceEditor
			title={nineSlice.title}
			value={((btn as Record<string, unknown>)[nineSlice.key] as Record<string, unknown>) ?? blankImage()}
			onChange={patch => model.setObjectContent(obj.id, { [nineSlice.key]: patch })}
			onClose={() => (nineSlice = null)}
		/>
	{/if}

	{#if buttonPicking}
		<PresetPicker kind='button' title={game.i18n.localize('splash.editor.objectTab.applyButtonPreset')} onPick={applyButtonPreset} onClose={() => (buttonPicking = false)} />
	{/if}
	{#if spritePicking}
		<PresetPicker kind='sprite' title={game.i18n.localize('splash.editor.objectTab.applySpritePreset')} onPick={applySpritePreset} onClose={() => (spritePicking = false)} />
	{/if}
{/if}

<style lang='scss'>
	.object-tab {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.empty {
		padding: 24px 12px;
		text-align: center;
		opacity: 0.5;
		font-size: 12px;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.subsection {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.images {
		display: flex;
		flex-direction: column;
		gap: 6px;

		.variant {
			display: flex;
			gap: 6px;
			align-items: center;
		}
	}

	.slice-btn {
		flex: 1;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		color: inherit;
		cursor: pointer;
		font-size: 12px;

		&:hover {
			border-color: rgba(255, 144, 0, 0.5);
		}

		&.ghost {
			opacity: 0.8;
		}
	}

	.x {
		width: 30px;
		height: 30px;
		background: none;
		border: 1px solid rgba(220, 60, 60, 0.4);
		border-radius: 4px;
		color: inherit;
		cursor: pointer;
	}

	.place {
		height: 32px;
		background: rgba(255, 144, 0, 0.18);
		border: 1px solid rgba(255, 144, 0, 0.5);
		border-radius: 4px;
		color: inherit;
		cursor: pointer;
	}

	.ctx-row {
		display: grid;
		grid-template-columns: 70px 1fr 30px;
		align-items: center;
		gap: 6px;
	}

	.ctx-key {
		font-size: 12px;
		opacity: 0.8;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ctx-add {
		display: grid;
		grid-template-columns: 1fr 30px;
		gap: 6px;
	}

	.preset-bar {
		display: flex;
		gap: 6px;
	}

	.preset-btn {
		flex: 1;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		color: inherit;
		cursor: pointer;
		font-size: 11px;

		&:hover {
			border-color: rgba(255, 144, 0, 0.5);
		}
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
</style>
