<svelte:options runes={true} />
<script lang='ts'>
	import type { SplashInitialized } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import { onMount } from 'svelte';
	import SplashUI from './SplashUI.svelte';

	const { splashConfig, foundryApp }: { splashConfig: SplashInitialized; foundryApp?: SvelteApplication } = $props();

	function exit() {
		// Preview exit is instant — skip the outro the live splash would otherwise play.
		void foundryApp?.close({ animate: false, skipOutro: true });
	}

	onMount(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				exit();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});
</script>

<SplashUI {splashConfig} {foundryApp} />

<button type='button' class='preview-exit' onclick={exit}>
	<i class='fa-solid fa-xmark'></i> {game.i18n.localize('splash.preview.previewHost.exitPreview')} <span class='hint'>{game.i18n.localize('splash.preview.previewHost.escHint')}</span>
</button>

<style lang='scss'>
	.preview-exit {
		position: fixed;
		top: 12px;
		right: 12px;
		z-index: 9999;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: rgba(0, 0, 0, 0.72);
		border: 1px solid #ff9800;
		border-radius: 6px;
		color: #fff;
		cursor: pointer;
		font-size: 13px;

		&:hover {
			background: rgba(255, 144, 0, 0.3);
		}

		.hint {
			opacity: 0.6;
			font-size: 11px;
		}
	}
</style>
