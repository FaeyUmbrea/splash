<svelte:options runes={true} />
<script lang='ts'>
	import type { StateCreate } from '../../datamodel/SplashModel.ts';
	import { NumberField } from '../ui';
	import AnimationEditor from './AnimationEditor.svelte';

	const { placement, stateLabel, stageWidth, onChange, onReplace, onPlace }: {
		placement?: StateCreate;
		stateLabel: string;
		stageWidth: number;
		onChange: (patch: Record<string, unknown>) => void;
		onReplace: (key: string, value: unknown) => void;
		onPlace: () => void;
	} = $props();
</script>
{#if placement}
	<div class='subsection'>
		<span class='sublabel'>{game.i18n.format('splash.editor.objectTab.placementIn', { state: stateLabel })}</span>
		<div class='grid'>
			<NumberField label={game.i18n.localize('splash.editor.objectTab.x')} value={placement.x ?? 0} onChange={v => onChange({ x: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.y')} value={placement.y ?? 0} onChange={v => onChange({ y: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.w')} value={placement.width ?? null} onChange={v => onChange({ width: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.h')} value={placement.height ?? null} onChange={v => onChange({ height: v })} />
			<NumberField label={game.i18n.localize('splash.editor.objectTab.z')} value={placement.zIndex ?? 0} onChange={v => onChange({ zIndex: v })} />
		</div>
		<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.stateAnimationIn')} width={stageWidth} value={placement.animIn} onChange={a => onReplace('animIn', a)} />
		<AnimationEditor label={game.i18n.localize('splash.editor.objectTab.stateAnimationOut')} width={stageWidth} value={placement.animOut} onChange={a => onReplace('animOut', a)} />
	</div>
{:else}
	<button type='button' class='place' onclick={onPlace}>
		<i class='fa-solid fa-plus'></i> {game.i18n.format('splash.editor.objectTab.placeInState', { state: stateLabel })}
	</button>
{/if}
<style lang='scss'>
	.subsection {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.sublabel {
		font-size: 12px;
		color: #bbb;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.place {
		min-height: 36px;
		color: inherit;
		border: 1px solid #ff900080;
		background: #ff900020;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
