<script lang='ts'>
	import type { TextSpriteInitialized } from '../../datamodel/SplashModel.ts';
	import type { SplashValues } from '../../renderer/SplashRenderer.ts';
	import { interpolate } from '../../utils/interpolate.ts';

	export let sprite: TextSpriteInitialized;
	export let values: SplashValues = {};

	$: display = interpolate(sprite.text ?? '', values);
</script>

<span
	style:font-family={sprite.font}
	style:font-size={sprite.size ? `${sprite.size}px` : undefined}
	style:color={sprite.fillColor}
	style:text-align={sprite.align}
>{display}</span>
