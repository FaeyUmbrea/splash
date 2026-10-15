<svelte:options runes={true} />
<script lang='ts'>
	import type { SplashInitialized } from '../datamodel/SplashModel.ts';
	import type { SvelteApplication } from '../mixins/SvelteApplicationMixin.svelte.ts';
	import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';
	import type { AuthoringIssue } from './editor/actionValidation.ts';
	import { onMount } from 'svelte';
	import ConnectionIssues from './editor/ConnectionIssues.svelte';
	import SplashUI from './SplashUI.svelte';

	const { splashConfig, foundryApp, issues = [] }: { splashConfig: SplashInitialized; foundryApp: SvelteApplication; issues?: AuthoringIssue[] } = $props();
	let revision = $state(0);
	let snapshot = $state<RuntimeSnapshot | null>(null);
	let ended = $state(false);
	const handout = $derived(splashConfig.layer === 'handout');

	/** Close the test host immediately and return to the editor. */
	function exit() {
		void foundryApp.close({ animate: false, skipOutro: true });
	}

	/** Start a fresh runtime from the editor's unchanged preview configuration. */
	function restart() {
		snapshot = null;
		ended = false;
		revision += 1;
	}

	/** Keep test controls available after a handout closes itself. */
	function endPlayback() {
		ended = true;
		if (snapshot) snapshot = { ...snapshot, loadedStates: [] };
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

<div class='preview-stage' class:handout style:width={handout ? `${splashConfig.handoutSize?.width ?? 800}px` : undefined} style:height={handout ? `${splashConfig.handoutSize?.height ?? 600}px` : undefined}>
	{#key revision}
		{#if !ended}
			<SplashUI {splashConfig} {foundryApp} onSnapshot={value => (snapshot = value)} onCloseRequested={endPlayback} />
		{/if}
	{/key}
</div>

<aside class='preview-controls' aria-label={game.i18n.localize('splash.preview.previewHost.testControls')}>
	<header>
		<h2>{game.i18n.localize('splash.preview.previewHost.testControls')}</h2>
		<button type='button' class='exit' onclick={exit}><i class='fa-solid fa-xmark'></i> {game.i18n.localize('splash.preview.previewHost.exitPreview')}</button>
	</header>
	<p>{game.i18n.localize('splash.preview.previewHost.localTest')}</p>
	<button type='button' class='restart' onclick={restart}><i class='fa-solid fa-rotate-right'></i> {game.i18n.localize('splash.preview.previewHost.restart')}</button>
	{#if ended}<p role='status'>{game.i18n.localize('splash.preview.previewHost.closed')}</p>{/if}
	<ConnectionIssues {issues} />
	<section>
		<h3>{game.i18n.localize('splash.preview.previewHost.states')}</h3>
		<ul>
			{#each Object.entries(splashConfig.states) as [key, state] (key)}
				<li class:loaded={snapshot?.loadedStates.includes(key)}><span>{state?.label || key}</span><small>{game.i18n.localize(snapshot?.loadedStates.includes(key) ? 'splash.preview.previewHost.loaded' : 'splash.preview.previewHost.unloaded')}</small></li>
			{/each}
		</ul>
	</section>
	<section>
		<h3>{game.i18n.localize('splash.preview.previewHost.values')}</h3>
		<dl>
			{#each Object.entries(snapshot?.values ?? {}) as [key, value] (key)}
				<div><dt>{key}</dt><dd>{String(value)}</dd></div>
			{:else}
				<p>{game.i18n.localize('splash.preview.previewHost.noValues')}</p>
			{/each}
		</dl>
	</section>
</aside>

<style lang='scss'>
	.preview-stage {
		position: absolute;
		inset: 0;
	}
	.handout {
		inset: 24px auto auto 24px;
		background: #111;
		border: 1px solid #ffffff40;
		box-shadow: 0 12px 48px #0008;
	}
	.preview-controls {
		position: fixed;
		top: 12px;
		right: 12px;
		width: 300px;
		max-height: calc(100vh - 24px);
		overflow: auto;
		z-index: 9999;
		padding: 16px;
		background: #202024f5;
		border: 1px solid #ff980080;
		border-radius: 6px;
		color: #e6e6e6;
		font-size: 13px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	h2, h3 {
		font-family: inherit;
		font-size: 14px;
		margin: 0;
		border: 0;
	}
	p {
		color: #bbb;
		line-height: 1.5;
	}
	.preview-controls button {
		width: auto;
		height: auto;
		min-height: 32px;
		padding: 6px 10px;
		background: #ffffff08;
		border: 1px solid #ffffff26;
		color: inherit;
		border-radius: 4px;
		font-size: 12px;
		cursor: pointer;
	}
	.preview-controls .restart {
		width: 100%;
		border-color: #ff980080;
	}
	section {
		margin-top: 18px;
	}
	ul, dl {
		padding: 0;
		margin: 8px 0 0;
	}
	li, dl div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid #ffffff12;
	}
	li {
		color: #aaa;
	}
	.loaded {
		color: #ffca7a;
	}
	small {
		font-size: 11px;
	}
	dt, dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
</style>
