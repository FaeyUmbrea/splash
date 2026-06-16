<script lang='ts'>
	import type { TextInputSpriteInitialized } from '../../datamodel/SplashModel.ts';
	import type { SplashValues, SpriteContext } from '../../renderer/SplashRenderer.ts';

	export let sprite: TextInputSpriteInitialized;
	export let values: SplashValues = {};
	export let context: SpriteContext = { onAction: () => {} };
	// Unused, but accepted so BaseSprite can pass the same prop set to every sprite component.
	export const overrides: Record<string, unknown> = {};

	$: current = String(values[sprite.valueKey ?? ''] ?? '');

	function onInput(e: Event) {
		const value = (e.currentTarget as HTMLInputElement).value;
		void context.onAction({ type: 'set-value', key: sprite.valueKey ?? '', value });
	}
</script>

<input
	type='text'
	class='splash-text-input'
	placeholder={sprite.placeholder ?? ''}
	value={current}
	style:font-size={sprite.fontSize ? `${sprite.fontSize}px` : undefined}
	style:color={sprite.color}
	style:background={sprite.bgColor}
	on:input={onInput}
/>

<style>
	.splash-text-input {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		padding: 0 8px;
		margin: 0;
		border: 0;
		outline: none;
	}
</style>
