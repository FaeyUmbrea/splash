<svelte:options runes={true} />
<script lang='ts'>
	import type { SplashPage } from '../utils/launch.ts';
	import type { ActiveSplash } from '../utils/settings.ts';
	import type { ContextMenuItem, Tab } from './ui';
	import { onDestroy, onMount } from 'svelte';
	import { SplashAPI } from '../api/api.ts';
	import { forceCloseAllSplashes, isPeeking, togglePeek } from '../apps/controller.ts';
	import { openSplashManager } from '../apps/SplashManager.ts';
	import { openSplashEditor, previewSplash } from '../sheet/splashActions.ts';
	import { allSplashPages } from '../utils/discovery.ts';
	import { getActiveSplash } from '../utils/settings.ts';
	import { ContextMenu, IconButton, ListRow, Tabs } from './ui';

	const layerLabel: Record<string, string> = { scene: 'Scene', hud: 'HUD', full: 'Full' };

	const isGM = !!game.user?.isGM;

	let tab = $state<'pinned' | 'global'>('pinned');
	let pages = $state<SplashPage[]>(allSplashPages());
	let active = $state<ActiveSplash | null>(getActiveSplash());
	let peeking = $state(isPeeking());
	let sceneId = $state<string | null>(canvas?.scene?.id ?? null);

	const activeName = $derived.by(() => {
		if (!active) return '';
		const page = fromUuidSync(active.uuid) as { name?: string } | null;
		return page?.name ?? 'Splash';
	});
	let menu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	const api = SplashAPI.getInstance();
	// Bumped on wall/region changes so the trigger list below re-derives (listBindings reads game data).
	let bindingRev = $state(0);

	/** Uuids a trigger (door/region) fires in the CURRENT scene — surfaced in Pinned even if not pinned. */
	const triggeredUuids = $derived.by<string[]>(() => {
		void bindingRev;
		if (!sceneId) return [];
		return api.registeredTriggers.flatMap(t => t.listBindings()).filter(b => b.sceneId === sceneId).map(b => b.splashUuid);
	});

	// Scene control only imposes FULLSCREEN splashes on the table — handouts are excluded from the toggle list.
	const fullscreen = $derived(pages.filter(p => p.system.layer !== 'handout'));
	const pinnedByFlag = $derived(sceneId ? fullscreen.filter(p => Array.from(p.system.scenePins ?? []).includes(sceneId!)) : []);
	// Pinned tab = explicitly pinned + anything wired to a trigger in this scene (any layer), deduped.
	const pinned = $derived.by<SplashPage[]>(() => {
		const out = [...pinnedByFlag];
		const seen = pinnedByFlag.map(p => p.uuid);
		for (const p of pages) {
			if (triggeredUuids.includes(p.uuid) && !seen.includes(p.uuid)) {
				out.push(p);
				seen.push(p.uuid);
			}
		}
		return out;
	});
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
		['splash.peek-changed', (v: unknown) => (peeking = v as boolean)],
		['canvasReady', () => (sceneId = canvas?.scene?.id ?? null)],
		['updateWall', () => (bindingRev += 1)],
		['createWall', () => (bindingRev += 1)],
		['deleteWall', () => (bindingRev += 1)],
		['createRegionBehavior', () => (bindingRev += 1)],
		['deleteRegionBehavior', () => (bindingRev += 1)],
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
	{#if isGM}
		<header class='launcher-header'>
			<span class='hdr-title'>Splashes</span>
			<IconButton icon='fa-solid fa-table-cells-large' title='Open Splash Manager' onclick={() => openSplashManager()} />
		</header>
	{/if}

	{#if active}
		<div class='live-banner'>
			<span class='live-dot' class:peeking></span>
			<span class='live-name'>{peeking ? 'Hidden' : 'Live'}: {activeName}</span>
			<IconButton
				icon={peeking ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}
				title={peeking ? 'Show splash again' : 'Minimize (hide for me, keep it running)'}
				active={peeking}
				onclick={() => togglePeek()}
			/>
			<IconButton
				icon='fa-solid fa-circle-xmark'
				title='Force-close every splash for everyone'
				danger
				onclick={() => void forceCloseAllSplashes()}
			/>
		</div>
	{/if}

	<Tabs {tabs} bind:value={tab} />

	<div class='list'>
		{#each shown as page (page.uuid)}
			{@const isActive = active?.uuid === page.uuid}
			<ListRow columns='1fr auto auto' active={isActive} oncontextmenu={e => rowMenu(e, page)}>
				<span class='name'>{#if triggeredUuids.includes(page.uuid)}<i class='fa-solid fa-bolt' title='Triggered in this scene'></i> {/if}{page.name}</span>
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

	.launcher-header {
		display: flex;
		align-items: center;
		justify-content: space-between;

		.hdr-title {
			font-size: 12px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			opacity: 0.7;
		}
	}

	.live-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 6px 5px 10px;
		border-radius: 4px;
		background: rgba(229, 57, 53, 0.12);
		border: 1px solid rgba(229, 57, 53, 0.4);
	}

	.live-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #e53935;
		box-shadow: 0 0 6px #e53935;

		&.peeking {
			background: #888;
			box-shadow: none;
		}
	}

	.live-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
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
