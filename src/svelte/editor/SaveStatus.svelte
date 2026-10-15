<svelte:options runes={true} />
<script lang='ts'>
	import type { DocumentStore } from './documentStore.svelte.ts';

	const { store }: { store: DocumentStore } = $props();
</script>

{#if store.error}
	<div class='save-error' role='alert'>
		<span>{game.i18n.localize('splash.editor.save.failed')}</span>
		<button type='button' onclick={() => store.retry()}>{game.i18n.localize('splash.editor.save.retry')}</button>
	</div>
{:else}
	<span class='save-state' role='status'>{game.i18n.localize(store.saving ? 'splash.editor.save.saving' : 'splash.editor.save.saved')}</span>
{/if}

<style lang='scss'>
	.save-error {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		color: #ffca7a;
		background: #ff980018;
		font-size: 12px;
	}
	.save-error button {
		width: auto;
		min-height: 32px;
		color: inherit;
		background: transparent;
		border: 1px solid #ff980080;
		cursor: pointer;
	}
	.save-state {
		padding: 4px 14px;
		color: #aaa;
		font-size: 11px;
	}
</style>
