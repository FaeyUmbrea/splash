<script lang='ts'>
	import type { GaugeSpriteInitialized } from '../../datamodel/SplashModel.ts';
	import type { SplashValues } from '../../renderer/SplashRenderer.ts';

	export let sprite: GaugeSpriteInitialized;
	export let values: SplashValues = {};
	// Unused, but BaseSprite passes the same prop set to every sprite component.
	export const overrides: Record<string, unknown> = {};

	$: min = sprite.min ?? 0;
	$: max = sprite.max ?? 100;
	$: raw = Number(values[sprite.valueKey ?? ''] ?? 0);
	$: fraction = Math.min(Math.max((raw - min) / ((max - min) || 1), 0), 1);
	$: percent = `${fraction * 100}%`;
</script>

<div class='splash-gauge' style:background={sprite.bgColor || 'transparent'}>
	<div
		class='fill'
		style:background={sprite.fillColor || 'transparent'}
		style:width={sprite.vertical ? '100%' : percent}
		style:height={sprite.vertical ? percent : '100%'}
	></div>
</div>

<style>
	.splash-gauge {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.fill {
		position: absolute;
		left: 0;
		bottom: 0;
	}
</style>
