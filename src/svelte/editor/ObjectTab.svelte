<svelte:options runes={true} />
<script lang='ts'>
	import type { ButtonSpriteCreate, ImageSpriteCreate, PanelSpriteCreate, SpriteCreate, TextSpriteCreate } from '../../datamodel/SplashModel.ts';
	import type { PresetPayload } from '../../utils/presets.ts';
	import type { SelectItem } from '../ui';
	import type { EditorModel } from './editorModel.svelte.ts';
	import { buttonSpriteToPreset, promptAndSavePreset } from '../../utils/presets.ts';
	import PresetPicker from '../presets/PresetPicker.svelte';
	import { ColorField, Field, ImageField, NumberField, Select, TextField } from '../ui';
	import ActionEditor from './ActionEditor.svelte';
	import AnimationEditor from './AnimationEditor.svelte';
	import EffectsEditor from './EffectsEditor.svelte';
	import NineSliceEditor from './NineSliceEditor.svelte';

	const { model }: { model: EditorModel } = $props();

	const obj = $derived(model.selected);
	const states = $derived(model.states.map(s => s.key));

	const alignOptions: SelectItem[] = [
		{ value: 'left', label: 'Left' },
		{ value: 'center', label: 'Center' },
		{ value: 'right', label: 'Right' },
		{ value: 'justify', label: 'Justify' },
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
	<div class='empty'>{model.selectedIds.length} objects selected — pick one to edit its properties.</div>
{:else if !obj}
	<div class='empty'>Select an object to edit it.</div>
{:else}
	{@const raw = obj.raw}
	<div class='object-tab'>
		<TextField label='Name' value={raw.name ?? ''} placeholder={obj.name} onChange={v => setContent({ name: v })} />

		<div class='preset-bar'>
			<button type='button' class='preset-btn' onclick={() => (spritePicking = true)}><i class='fa-solid fa-folder-open'></i> Apply sprite preset</button>
			{#if isGM}
				<button type='button' class='preset-btn' onclick={() => promptAndSavePreset({ type: 'sprite', value: raw as SpriteCreate }, raw.name || obj.name)}><i class='fa-solid fa-floppy-disk'></i> Save sprite preset</button>
			{/if}
		</div>

		{#if obj.type === 'image'}
			{@const img = raw as ImageSpriteCreate}
			<ImageField label='Image' value={img.img ?? ''} onChange={v => setContent({ img: v })} />
		{:else if obj.type === 'text'}
			{@const text = raw as TextSpriteCreate}
			<TextField label='Text' value={text.text ?? ''} onChange={v => setContent({ text: v })} />
			<TextField label='Font' value={text.font ?? 'Arial'} onChange={v => setContent({ font: v })} />
			<NumberField label='Size' value={text.size ?? 34} onChange={v => setContent({ size: v })} />
			<ColorField label='Color' value={text.fillColor ?? '#ffffff'} onChange={v => setContent({ fillColor: v })} />
			<Field label='Align'>
				<Select options={alignOptions} value={text.align ?? 'center'} searchable={false} onChange={v => setContent({ align: v })} />
			</Field>
		{:else if obj.type === 'button'}
			{@const btn = raw as ButtonSpriteCreate}
			<TextField label='Label' value={btn.label?.text ?? ''} onChange={v => setContent({ label: { text: v } })} />
			<NumberField label='Label size' value={btn.label?.fontSize ?? 20} onChange={v => setContent({ label: { fontSize: v } })} />
			<ColorField label='Label color' value={btn.label?.fill ?? '#ffffff'} onChange={v => setContent({ label: { fill: v } })} />

			<div class='images'>
				<span class='sublabel'>Button images (nine-slice)</span>
				<button type='button' class='slice-btn' onclick={() => (nineSlice = { key: 'image', title: 'Image' })}>
					<i class='fa-solid fa-table-cells-large'></i> Edit image
				</button>
				{#each [['hoverImage', 'Hover'], ['clickImage', 'Click']] as [key, label] (key)}
					{@const present = !!(btn as Record<string, unknown>)[key]}
					<div class='variant'>
						{#if present}
							<button type='button' class='slice-btn' onclick={() => (nineSlice = { key: key as 'hoverImage', title: label })}>
								<i class='fa-solid fa-table-cells-large'></i> Edit {label.toLowerCase()} image
							</button>
							<button type='button' class='x' title='Remove' aria-label='Remove' onclick={() => model.replaceObjectField(obj.id, key, null)}><i class='fa-solid fa-trash'></i></button>
						{:else}
							<button type='button' class='slice-btn ghost' onclick={() => model.replaceObjectField(obj.id, key, blankImage())}>
								<i class='fa-solid fa-plus'></i> Add {label.toLowerCase()} image
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<div class='subsection'>
				<span class='sublabel'>On click</span>
				<ActionEditor action={btn.onClick} {states} onChange={a => model.replaceObjectField(obj.id, 'onClick', a)} />
			</div>

			<div class='subsection'>
				<span class='sublabel'>Macro context</span>
				{#each Object.entries(ctxData) as [key, value] (key)}
					<div class='ctx-row'>
						<span class='ctx-key' title={key}>{key}</span>
						<TextField value={displayContext(value)} onChange={v => setContext(key, parseContext(v))} />
						<button type='button' class='x' title='Remove' aria-label='Remove' onclick={() => removeContext(key)}><i class='fa-solid fa-trash'></i></button>
					</div>
				{/each}
				<div class='ctx-add'>
					<TextField bind:value={newContextKey} placeholder='context key' />
					<button type='button' class='x' title='Add' aria-label='Add' onclick={addContext}><i class='fa-solid fa-plus'></i></button>
				</div>
			</div>

			<div class='preset-bar'>
				<button type='button' class='preset-btn' onclick={() => (buttonPicking = true)}><i class='fa-solid fa-folder-open'></i> Apply button preset</button>
				{#if isGM}
					<button type='button' class='preset-btn' onclick={() => promptAndSavePreset(buttonSpriteToPreset(btn), btn.label?.text || 'Button')}><i class='fa-solid fa-floppy-disk'></i> Save as preset</button>
				{/if}
			</div>
		{:else if obj.type === 'panel'}
			{@const panel = raw as PanelSpriteCreate}
			<ColorField label='Fill' value={panel.fill ?? '#222831'} onChange={v => setContent({ fill: v })} />
			<div class='grid'>
				<ColorField label='Border color' value={panel.borderColor ?? '#000000'} onChange={v => setContent({ borderColor: v })} />
				<NumberField label='Border width' value={panel.borderWidth ?? 0} min={0} onChange={v => setContent({ borderWidth: v })} />
			</div>
			<NumberField label='Corner radius' value={panel.radius ?? 0} min={0} onChange={v => setContent({ radius: v })} />
		{/if}

		<div class='subsection'>
			<AnimationEditor label='Animation in' width={model.stageW} value={raw.animIn} onChange={a => model.replaceObjectField(obj.id, 'animIn', a)} />
			<AnimationEditor label='Animation out' width={model.stageW} value={raw.animOut} onChange={a => model.replaceObjectField(obj.id, 'animOut', a)} />
		</div>

		<div class='subsection'>
			<EffectsEditor effects={(raw.effects as Record<string, unknown>[]) ?? []} onChange={e => model.replaceObjectField(obj.id, 'effects', e)} />
		</div>

		{#if obj.inState && obj.placement}
			<div class='subsection'>
				<span class='sublabel'>Placement in "{model.activeState}"</span>
				<div class='grid'>
					<NumberField label='X' value={obj.placement.x ?? 0} onChange={v => setPlace({ x: v })} />
					<NumberField label='Y' value={obj.placement.y ?? 0} onChange={v => setPlace({ y: v })} />
					<NumberField label='W' value={obj.placement.width ?? null} onChange={v => setPlace({ width: v })} />
					<NumberField label='H' value={obj.placement.height ?? null} onChange={v => setPlace({ height: v })} />
					<NumberField label='Z' value={obj.placement.zIndex ?? 0} onChange={v => setPlace({ zIndex: v })} />
				</div>
				<AnimationEditor label='State animation in' width={model.stageW} value={obj.placement.animIn} onChange={a => model.replacePlacementField(obj.id, 'animIn', a)} />
				<AnimationEditor label='State animation out' width={model.stageW} value={obj.placement.animOut} onChange={a => model.replacePlacementField(obj.id, 'animOut', a)} />
			</div>
		{:else}
			<button type='button' class='place' onclick={() => model.placeInState(obj.id)}>
				<i class='fa-solid fa-plus'></i> Place in "{model.activeState}"
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
		<PresetPicker kind='button' title='Apply button preset' onPick={applyButtonPreset} onClose={() => (buttonPicking = false)} />
	{/if}
	{#if spritePicking}
		<PresetPicker kind='sprite' title='Apply sprite preset' onPick={applySpritePreset} onClose={() => (spritePicking = false)} />
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
