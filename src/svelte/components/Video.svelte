<script lang='ts'>
	import type { VideoSpriteInitialized } from '../../datamodel/SplashModel.ts';

	export let sprite: VideoSpriteInitialized;
	// Unused, but BaseSprite passes the same prop set to every sprite component.
	export const overrides: Record<string, unknown> = {};
</script>

<video
	src={sprite.src}
	loop={sprite.loop ?? true}
	muted={sprite.muted ?? true}
	autoplay={sprite.autoplay ?? true}
	playsinline
></video>

<style>
	video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>
