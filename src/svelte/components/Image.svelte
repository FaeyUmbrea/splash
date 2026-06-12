<script lang='ts'>
	import type { ImageSpriteInitialized } from '../../datamodel/SplashModel.ts';

	export let sprite: ImageSpriteInitialized;
</script>

<img src={sprite.img} />
