<script lang='ts'>
	import type { ButtonSpriteInitialized } from '../../datamodel/SplashModel.ts';
	import { SplashAPI } from '../../api/api.ts';

	export let sprite: ButtonSpriteInitialized;

	let hover = false;
	let active = false;

	$: image = (active ? sprite.clickImage : hover ? sprite.hoverImage : undefined) ?? sprite.image;
	$: label = (active ? sprite.clickLabel : hover ? sprite.hoverLabel : undefined) ?? sprite.label;
</script>

<!-- border-image is the DOM analog of a PIXI NineSlicePlane: the slice values
     carve the texture into corners/edges/center exactly like the GL renderer. -->
<button
	type='button'
	style:border-image-source='url({image.url})'
	style:border-image-slice='{image.topHeight} {image.rightWidth} {image.bottomHeight} {image.leftWidth} fill'
	style:border-width='{image.topHeight}px {image.rightWidth}px {image.bottomHeight}px {image.leftWidth}px'
	on:mouseenter={() => hover = true}
	on:mouseleave={() => {
		hover = false;
		active = false;
	}}
	on:mousedown={() => active = true}
	on:mouseup={() => active = false}
	on:click={() => SplashAPI.getInstance().processAction(sprite.onClick)}
>
	<span
		style:font-size='{label.fontSize}px'
		style:color={label.fill}
		style:-webkit-text-stroke='{label.strokeThickness}px {label.stroke}'
	>{label.text}</span>
</button>

<style>
	button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		padding: 0;
		background: none;
		border-style: solid;
		border-color: transparent;
		cursor: pointer;
	}
</style>
