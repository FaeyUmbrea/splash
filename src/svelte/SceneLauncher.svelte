<svelte:options runes={true} />
<script lang='ts'>
	import type { SplashPage } from '../utils/launch.ts';
	import type { ActiveSplash } from '../utils/settings.ts';
	import type { ContextMenuItem, Tab } from './ui';
	import { onDestroy, onMount } from 'svelte';
	import { SplashAPI } from '../api/api.ts';
	import { openSplashManager } from '../apps/SplashManager.ts';
	import { openSplashEditor, previewSplash } from '../sheet/splashActions.ts';
	import { allSplashPages } from '../utils/discovery.ts';
	import { getActiveSplash } from '../utils/settings.ts';
	import { ContextMenu, IconButton, ListRow, Tabs } from './ui';

	const layerLabel: Record<string, string> = { scene: 'Scene', hud: 'HUD', full: 'Full' };

	let tab = $state<'pinned' | 'global'>('pinned');
	let pages = $state<SplashPage[]>(allSplashPages());
	let active = $state<ActiveSplash | null>(getActiveSplash());
	let sceneId = $state<string | null>(canvas?.scene?.id ?? null);
	let menu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	// Scene control only imposes FULLSCREEN splashes on the table — handouts are excluded.
	const fullscreen = $derived(pages.filter(p => p.system.layer !== 'handout'));
	const pinned = $derived(sceneId ? fullscreen.filter(p => Array.from(p.system.scenePins ?? []).includes(sceneId!)) : []);
	const global = $derived(fullscreen.filter(p => p.system.global));
	const shown = $derived(tab === 'pinned' ? pinned : global);

	const tabs = $derived<Tab[]>([
		{ id: 'pinned', label: `Pinned (${pinned.length})`, icon: 'fa-solid fa-thumbtack', disabled: pinned.length === 0 },
		{ id: 'global', label: `Global (${global.length})`, icon: 'fa-solid fa-globe' },
	]);

	function refresh() {
		pages = allSplashPages();
		active = getActiveSplash();
		sceneId = canvas?.scene?.id ?? null;
	}

	const hooks: [string, (...a: unknown[]) => void][] = [
		['updateJournalEntryPage', refresh],
		['createJournalEntryPage', refresh],
		['deleteJournalEntryPage', refresh],
		['splash.active-changed', (v: unknown) => (active = v as ActiveSplash | null)],
		['canvasReady', () => (sceneId = canvas?.scene?.id ?? null)],
	];
	const ids: number[] = [];
	onMount(() => hooks.forEach(([h, fn]) => ids.push(Hooks.on(h, fn))));
	onDestroy(() => hooks.forEach(([h], i) => Hooks.off(h, ids[i])));

	// If no scene is pinned, default the visible tab to Global.
	$effect(() => {
		if (tab === 'pinned' && pinned.length === 0) tab = 'global';
	});

	function toggle(page: SplashPage) {
		if (active?.uuid === page.uuid) void SplashAPI.getInstance().close({ global: true });
		else void SplashAPI.getInstance().launch(page.uuid, { global: true });
	}

	function rowMenu(event: MouseEvent, page: SplashPage) {
		event.preventDefault();
		menu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				{ label: 'Preview (just me)', icon: 'fa-solid fa-eye', action: () => previewSplash(page) },
				{ label: 'Open editor', icon: 'fa-solid fa-pen-to-square', action: () => openSplashEditor(page) },
				{ label: 'Open manager', icon: 'fa-solid fa-images', action: () => openSplashManager() },
			],
		};
	}
</script>

<div class='scene-launcher'>
	<Tabs {tabs} bind:value={tab} />

	<div class='list'>
		{#each shown as page (page.uuid)}
			{@const isActive = active?.uuid === page.uuid}
			<ListRow columns='1fr auto auto' active={isActive} oncontextmenu={e => rowMenu(e, page)}>
				<span class='name'>{page.name}</span>
				<span class='chip'>{layerLabel[page.system.layer] ?? page.system.layer}</span>
				<IconButton
					icon={isActive ? 'fa-solid fa-stop' : 'fa-solid fa-play'}
					title={isActive ? 'Kill' : 'Launch for players'}
					active={isActive}
					danger={isActive}
					onclick={() => toggle(page)}
				/>
			</ListRow>
		{/each}
		{#if shown.length === 0}
			<div class='empty'>
				{tab === 'pinned' ? 'No splashes pinned to this scene.' : 'No global splashes.'}
			</div>
		{/if}
	</div>
</div>

{#if menu}
	<ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => (menu = null)} />
{/if}

<style lang='scss'>
	.scene-launcher {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chip {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 10px;
		background: rgba(255, 144, 0, 0.18);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.empty {
		padding: 18px;
		text-align: center;
		opacity: 0.5;
		font-size: 12px;
	}
</style>
