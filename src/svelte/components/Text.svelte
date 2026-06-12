<script lang='ts'>
	import type { TextSpriteInitialized } from '../../datamodel/SplashModel.ts';

	export let sprite: TextSpriteInitialized;
</script>

<span
	style:font-family={sprite.font}
	style:font-size={sprite.size ? `${sprite.size}px` : undefined}
	style:color={sprite.fillColor}
	style:text-align={sprite.align}
>{sprite.text}</span>
