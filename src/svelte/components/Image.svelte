<script lang='ts'>
	import type { ImageSpriteInitialized } from '../../datamodel/SplashModel.ts';

	export let sprite: ImageSpriteInitialized;
	// Accepted (unused) so BaseSprite passes the same prop set to every sprite component.
	export const overrides: Record<string, unknown> = {};
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
