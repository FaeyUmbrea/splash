<svelte:options runes={true} />
<script lang='ts'>
	import { ColorField, IconButton, NumberField } from '../ui';

	type Effect = Record<string, unknown> & { type?: string };

	const {
		effects,
		onChange,
	}: {
		effects: Effect[];
		onChange: (effects: Effect[]) => void;
	} = $props();

	function add() {
		onChange([...effects, { type: 'glitch', bands: 8, intensity: 0.01, tint: '#0044ff' }]);
	}
	function remove(index: number) {
		onChange(effects.filter((_, i) => i !== index));
	}
	function patch(index: number, p: Partial<Effect>) {
		onChange(effects.map((e, i) => (i === index ? { ...e, ...p } : e)));
	}
</script>

<div class='effects'>
	<div class='head'>
		<span class='sublabel'>{game.i18n.localize('splash.editor.effectsEditor.heading')}</span>
		<IconButton icon='fa-solid fa-plus' title={game.i18n.localize('splash.editor.effectsEditor.addEffect')} onclick={add} />
	</div>
	{#each effects as effect, i (i)}
		<div class='effect'>
			<div class='effect-head'>
				<span>{game.i18n.localize('splash.editor.effectsEditor.glitch')}</span>
				<IconButton icon='fa-solid fa-trash' title={game.i18n.localize('splash.editor.effectsEditor.removeEffect')} danger onclick={() => remove(i)} />
			</div>
			<div class='grid'>
				<NumberField label={game.i18n.localize('splash.editor.effectsEditor.bands')} value={(effect.bands as number) ?? 8} onChange={v => patch(i, { bands: v ?? 8 })} />
				<NumberField label={game.i18n.localize('splash.editor.effectsEditor.intensity')} step={0.01} value={(effect.intensity as number) ?? 0.01} onChange={v => patch(i, { intensity: v ?? 0.01 })} />
			</div>
			<ColorField label={game.i18n.localize('splash.editor.effectsEditor.tint')} value={(effect.tint as string) ?? '#0044ff'} onChange={v => patch(i, { tint: v })} />
		</div>
	{/each}
</div>

<style lang='scss'>
	.effects {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sublabel {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		opacity: 0.6;
	}

	.effect {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		border-radius: 4px;

		.effect-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: 12px;
		}
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}
</style>
