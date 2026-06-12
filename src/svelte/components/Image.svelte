<script lang='ts'>
	import type { ImageSpriteInitialized } from '../../datamodel/SplashModel.ts';

	export let sprite: ImageSpriteInitialized;
</script>

<img src={sprite.img} alt={sprite.name} />

<style>
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: fill;
	}
</style>
