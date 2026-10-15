<svelte:options runes={true} />
<script lang='ts'>
	const { onScratch, onPrefab }: {
		onScratch: () => void;
		onPrefab: () => void;
	} = $props();
</script>

<section class='splash-editor-start' aria-label={game.i18n.localize('splash.editor.start.title')}>
	<div class='choices'>
		<h2>{game.i18n.localize('splash.editor.start.title')}</h2>
		<p>{game.i18n.localize('splash.editor.start.intro')}</p>
		<button type='button' onclick={onScratch}>
			<i class='fa-solid fa-plus'></i>
			<span><strong>{game.i18n.localize('splash.editor.start.scratch')}</strong><small>{game.i18n.localize('splash.editor.start.scratchHint')}</small></span>
		</button>
		<button type='button' onclick={onPrefab}>
			<i class='fa-solid fa-cubes'></i>
			<span><strong>{game.i18n.localize('splash.editor.library.prefab')}</strong><small>{game.i18n.localize('splash.editor.library.prefabHint')}</small></span>
		</button>
	</div>
</section>

<style lang='scss'>
	.splash-editor-start {
		flex: 1;
		min-width: 0;
		display: grid;
		place-items: center;
		padding: 24px;
		overflow: auto;
	}
	.choices {
		width: min(100%, 440px);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2, p {
		margin: 0;
	}
	.splash-editor-start h2 {
		font-family: inherit;
		font-size: 24px;
	}
	p, small {
		color: #bbb;
		line-height: 1.6;
		font-size: 13px;
	}
	p {
		margin-bottom: 12px;
	}
	.splash-editor-start button {
		height: auto;
		min-height: 90px;
		white-space: normal;
		line-height: 1.4;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 18px;
		text-align: left;
		color: inherit;
		border: 1px solid #ffffff26;
		border-radius: 6px;
		background: #ffffff05;
		cursor: pointer;
	}
	button:hover, button:focus-visible {
		border-color: #ff9800;
		background: #ff980012;
	}
	strong, small {
		display: block;
	}
	strong {
		margin-bottom: 4px;
		font-size: 14px;
	}
</style>
