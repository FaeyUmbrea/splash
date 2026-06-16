<script lang='ts'>
	import type { DropZoneSpriteInitialized } from '../../datamodel/SplashModel.ts';

	export let sprite: DropZoneSpriteInitialized;
	// Unused, but every sprite component accepts the same prop set from BaseSprite.
	export const overrides: Record<string, unknown> = {};
</script>

<!-- The data attributes let draggables discover and filter this zone purely from the DOM, in either renderer. -->
<div
	class='splash-drop-zone'
	data-splash-dropzone='true'
	data-zone-id={sprite.id}
	data-accepts={sprite.accepts ?? ''}
	data-highlight={sprite.highlightColor || '#4caf50'}
	style:background={sprite.fill || 'transparent'}
	style:border={sprite.borderWidth ? `${sprite.borderWidth}px solid ${sprite.borderColor || '#fff'}` : 'none'}
	style:border-radius='{sprite.radius ?? 0}px'
></div>

<style>
	.splash-drop-zone {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
	}
</style>
