<svelte:options runes={true} />
<script lang='ts'>
	import type { PresetPayload } from '../../utils/presets.ts';
	import type { SelectItem } from '../ui';
	import { promptAndSavePreset } from '../../utils/presets.ts';
	import PresetPicker from '../presets/PresetPicker.svelte';
	import { CheckboxField, ColorField, Field, IconButton, NumberField, Select } from '../ui';
	import OriginEditor from './OriginEditor.svelte';

	type Anim = Record<string, unknown> & { type?: string };

	const {
		value,
		label,
		width = 1920,
		onChange,
	}: {
		value: Anim | null | undefined;
		label: string;
		/** Stage width for the visual origin editor. */
		width?: number;
		/** Replace the whole animation (or null to clear it). */
		onChange: (animation: Anim | null) => void;
	} = $props();

	const typeOptions: SelectItem[] = [
		{ value: '', label: game.i18n.localize('splash.editor.animationEditor.typeNone') },
		{ value: 'dissolve', label: game.i18n.localize('splash.editor.animationEditor.typeDissolve') },
		{ value: 'glitch', label: game.i18n.localize('splash.editor.animationEditor.typeGlitch') },
	];
	const originTypeOptions: SelectItem[] = [
		{ value: 'randomOrigins', label: game.i18n.localize('splash.editor.animationEditor.originRandom') },
		{ value: 'fixedOrigins', label: game.i18n.localize('splash.editor.animationEditor.originFixed') },
	];

	const type = $derived(value?.type ?? '');
	// Dissolve keeps the origin variant directly in `props`; glitch nests it under `props.origins`.
	const props = $derived((value?.props ?? {}) as Record<string, unknown>);
	const origins = $derived((value?.type === 'dissolve' ? props : (props.origins ?? {})) as Record<string, unknown>);
	const originType = $derived((origins.type as string) ?? 'randomOrigins');

	function randomOrigins(n = 5) {
		return { type: 'randomOrigins', randomOrigins: true, numOrigins: n };
	}
	function dissolveDefault(): Anim {
		return { type: 'dissolve', duration: 1000, delay: 0, props: randomOrigins() };
	}
	function glitchDefault(): Anim {
		return { type: 'glitch', duration: 1000, delay: 0, props: { origins: randomOrigins(), bands: 20, intensity: 0.05, tint: '#0044ff', invert: false } };
	}

	function setType(t: string | string[] | null) {
		if (!t) onChange(null);
		else onChange(t === 'dissolve' ? dissolveDefault() : glitchDefault());
	}
	function patchAnim(p: Partial<Anim>) {
		onChange({ ...value, ...p } as Anim);
	}
	function setOrigins(o: Record<string, unknown>) {
		if (value?.type === 'dissolve') onChange({ ...value, props: o });
		else onChange({ ...value, props: { ...props, origins: o } } as Anim);
	}
	function patchGlitch(p: Record<string, unknown>) {
		onChange({ ...value, props: { ...props, ...p } } as Anim);
	}

	let picking = $state(false);
	const isGM = !!game.user?.isGM;

	function applyPreset(payload: PresetPayload) {
		if (payload.type === 'animation') onChange(payload.value as Anim);
	}
</script>

<div class='animation-editor'>
	<div class='label-row'>
		<span class='sublabel'>{label}</span>
		<span class='preset-actions'>
			<IconButton icon='fa-solid fa-folder-open' title={game.i18n.localize('splash.editor.animationEditor.applyPreset')} onclick={() => (picking = true)} />
			{#if isGM && value}
				<IconButton icon='fa-solid fa-floppy-disk' title={game.i18n.localize('splash.editor.animationEditor.savePreset')} onclick={() => promptAndSavePreset({ type: 'animation', value } as PresetPayload, game.i18n.localize('splash.editor.animationEditor.presetDefaultName'))} />
			{/if}
		</span>
	</div>
	<Select options={typeOptions} value={type} searchable={false} onChange={setType} />

	{#if value}
		<div class='grid'>
			<NumberField label={game.i18n.localize('splash.editor.animationEditor.duration')} value={(value.duration as number) ?? 1000} onChange={v => patchAnim({ duration: v ?? 0 })} />
			<NumberField label={game.i18n.localize('splash.editor.animationEditor.delay')} value={(value.delay as number) ?? 0} onChange={v => patchAnim({ delay: v ?? 0 })} />
		</div>

		<Field label={game.i18n.localize('splash.editor.animationEditor.origins')}>
			<Select options={originTypeOptions} value={originType} searchable={false} onChange={t => setOrigins(t === 'randomOrigins' ? randomOrigins() : { type: 'fixedOrigins', origins: [] })} />
		</Field>
		{#if originType === 'randomOrigins'}
			<NumberField label={game.i18n.localize('splash.editor.animationEditor.originCount')} value={(origins.numOrigins as number) ?? 5} onChange={v => setOrigins(randomOrigins(v ?? 1))} />
		{:else}
			<OriginEditor
				origins={(origins.origins as number[]) ?? []}
				{width}
				onChange={o => setOrigins({ type: 'fixedOrigins', origins: o })}
			/>
		{/if}

		{#if value.type === 'glitch'}
			<div class='grid'>
				<NumberField label={game.i18n.localize('splash.editor.animationEditor.bands')} value={(props.bands as number) ?? 20} onChange={v => patchGlitch({ bands: v ?? 1 })} />
				<NumberField label={game.i18n.localize('splash.editor.animationEditor.intensity')} step={0.01} value={(props.intensity as number) ?? 0.05} onChange={v => patchGlitch({ intensity: v ?? 0 })} />
			</div>
			<ColorField label={game.i18n.localize('splash.editor.animationEditor.tint')} value={(props.tint as string) ?? '#0044ff'} onChange={v => patchGlitch({ tint: v })} />
			<CheckboxField label={game.i18n.localize('splash.editor.animationEditor.invert')} value={(props.invert as boolean) ?? false} onChange={v => patchGlitch({ invert: v })} />
		{/if}
	{/if}
</div>

{#if picking}
	<PresetPicker kind='animation' title={game.i18n.localize('splash.editor.animationEditor.applyPreset')} onPick={applyPreset} onClose={() => (picking = false)} />
{/if}

<style lang='scss'>
	.animation-editor {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.preset-actions {
		display: flex;
		gap: 2px;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}
</style>
