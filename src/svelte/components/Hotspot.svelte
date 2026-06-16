<script lang='ts'>
	import type { HotspotSpriteInitialized } from '../../datamodel/SplashModel.ts';
	import type { SpriteContext } from '../../renderer/SplashRenderer.ts';

	export let sprite: HotspotSpriteInitialized;
	export let context: SpriteContext = { onAction: () => {} };
	// Unused, but accepted so BaseSprite can pass the same prop set to every sprite component.
	export const overrides: Record<string, unknown> = {};
</script>

<button
	type='button'
	class='splash-hotspot'
	aria-label={sprite.name}
	on:click={() => context.onAction(sprite.onClick)}
></button>

<style>
	.splash-hotspot {
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		margin: 0;
		background: transparent;
		border: 0;
		cursor: pointer;
	}
</style>
