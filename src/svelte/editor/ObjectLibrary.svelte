<svelte:options runes={true} />
<script lang='ts'>
	import type { SpriteType } from './spriteFactory.ts';
	import { onMount } from 'svelte';

	const { onAdd, onPrefab, onClose }: {
		onAdd: (type: SpriteType) => void;
		onPrefab: () => void;
		onClose: () => void;
	} = $props();

	/** Available object types grouped by what the author wants to make. */
	const categories: { key: string; types: SpriteType[] }[] = [
		{ key: 'display', types: ['image', 'text', 'panel', 'video'] },
		{ key: 'interaction', types: ['button', 'hotspot', 'text-input', 'gauge', 'draggable', 'drop-zone'] },
	];
	let dialog: HTMLDialogElement;
	onMount(() => dialog.showModal());
</script>

<dialog class='splash-object-library' bind:this={dialog} onclose={onClose} oncancel={onClose} aria-labelledby='splash-object-library-title'>
	<header>
		<div>
			<h2 id='splash-object-library-title'>{game.i18n.localize('splash.editor.library.title')}</h2>
			<p>{game.i18n.localize('splash.editor.library.intro')}</p>
		</div>
		<button type='button' class='close' aria-label={game.i18n.localize('splash.presets.presetPicker.close')} onclick={onClose}><i class='fa-solid fa-xmark'></i></button>
	</header>
	<button type='button' class='prefab' onclick={onPrefab}>
		<i class='fa-solid fa-cubes'></i>
		<span><strong>{game.i18n.localize('splash.editor.library.prefab')}</strong><small>{game.i18n.localize('splash.editor.library.prefabHint')}</small></span>
		<i class='fa-solid fa-arrow-right'></i>
	</button>
	{#each categories as category (category.key)}
		<section>
			<h3>{game.i18n.localize(`splash.editor.library.${category.key}`)}</h3>
			<div class='objects'>
				{#each category.types as type (type)}
					<button type='button' class='object' onclick={() => onAdd(type)}>
						<strong>{game.i18n.localize(`splash.editor.library.types.${type}.name`)}</strong>
						<small>{game.i18n.localize(`splash.editor.library.types.${type}.hint`)}</small>
					</button>
				{/each}
			</div>
		</section>
	{/each}
</dialog>

<style lang='scss'>
	.splash-object-library {
		width: min(680px, 90vw);
		max-height: 85vh;
		overflow: auto;
		padding: 24px;
		background: #202024;
		color: #e6e6e6;
		border: 1px solid #ffffff26;
		border-radius: 8px;
	}
	dialog::backdrop {
		background: #0009;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}
	h2, h3, p {
		margin: 0 0 12px;
	}
	.splash-object-library h2 {
		font-family: inherit;
		font-size: 22px;
	}
	h3 {
		font-size: 14px;
		margin-top: 24px;
	}
	p, small {
		color: #bbb;
		font-size: 13px;
		line-height: 1.5;
	}
	.splash-object-library button {
		height: auto;
		white-space: normal;
		line-height: 1.4;
		color: inherit;
		cursor: pointer;
		border: 1px solid #ffffff26;
		border-radius: 4px;
		background: #ffffff05;
	}
	button:hover, button:focus-visible {
		border-color: #ff9800;
		background: #ff980012;
	}
	.splash-object-library .close {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}
	.splash-object-library .prefab {
		min-height: 80px;
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%;
		padding: 16px;
		text-align: left;
		border-color: #ff980060;
	}
	.prefab span {
		flex: 1;
	}
	strong, small {
		display: block;
	}
	strong {
		font-size: 14px;
		margin-bottom: 4px;
	}
	.objects {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.splash-object-library .object {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 4px;
		min-height: 76px;
		padding: 12px;
		text-align: left;
	}
</style>
