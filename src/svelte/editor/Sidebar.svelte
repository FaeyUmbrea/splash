<svelte:options runes={true} />
<script lang='ts'>
	import type { Tab } from '../ui';
	import type { EditorModel } from './editorModel.svelte.ts';
	import { Tabs } from '../ui';
	import ObjectTab from './ObjectTab.svelte';
	import SplashTab from './SplashTab.svelte';
	import StateTab from './StateTab.svelte';

	const { model }: { model: EditorModel } = $props();

	let tab = $state('object');
	const tabs: Tab[] = [
		{ id: 'object', label: game.i18n.localize('splash.editor.sidebar.tabObject'), icon: 'fa-solid fa-cube' },
		{ id: 'state', label: game.i18n.localize('splash.editor.sidebar.tabState'), icon: 'fa-solid fa-clapperboard' },
		{ id: 'splash', label: game.i18n.localize('splash.editor.sidebar.tabSplash'), icon: 'fa-solid fa-image' },
	];

	// Selecting an object jumps to the Object tab (but manual tab switches stick).
	$effect(() => {
		if (model.selectedId) tab = 'object';
	});
</script>

<div class='sidebar'>
	<div class='tabs'><Tabs {tabs} bind:value={tab} /></div>
	<div class='content'>
		{#if tab === 'object'}
			<ObjectTab {model} />
		{:else if tab === 'state'}
			<StateTab {model} />
		{:else}
			<SplashTab {model} />
		{/if}
	</div>
</div>

<style lang='scss'>
	.sidebar {
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;

		.tabs {
			padding: 6px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		}

		.content {
			flex: 1;
			overflow-y: auto;
			padding: 10px;
		}
	}
</style>
