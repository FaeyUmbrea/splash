<script lang='ts'>
	import type { PanelSpriteInitialized } from '../../datamodel/SplashModel.ts';

	export let sprite: PanelSpriteInitialized;
	// Unused, but every sprite component accepts the same prop set from BaseSprite.
	export const overrides: Record<string, unknown> = {};
</script>

<div
	class='splash-panel'
	style:background={sprite.fill || 'transparent'}
	style:border={sprite.borderWidth ? `${sprite.borderWidth}px solid ${sprite.borderColor || '#000'}` : 'none'}
	style:border-radius='{sprite.radius ?? 0}px'
></div>

<style>
	.splash-panel {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
	}
</style>
