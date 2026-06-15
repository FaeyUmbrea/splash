<svelte:options runes={true} />
<script lang='ts'>
	import type { ActiveSplash } from '../utils/settings.ts';
	import { onDestroy, onMount } from 'svelte';
	import { forceCloseAllSplashes, isPeeking, togglePeek } from '../apps/controller.ts';
	import { getActiveSplash } from '../utils/settings.ts';
	import { IconButton } from './ui';

	let active = $state<ActiveSplash | null>(getActiveSplash());
	let peeking = $state(isPeeking());
	let rev = $state(0);

	const name = $derived.by(() => {
		void rev;
		if (!active) return '';
		const page = fromUuidSync(active.uuid) as { name?: string } | null;
		return page?.name ?? game.i18n.localize('splash.ui.gmLiveControls.defaultName');
	});

	const hooks: [string, (...a: unknown[]) => void][] = [
		['splash.active-changed', (v: unknown) => (active = v as ActiveSplash | null)],
		['splash.peek-changed', (v: unknown) => (peeking = v as boolean)],
		['updateJournalEntryPage', () => (rev += 1)],
	];
	const ids: number[] = [];
	onMount(() => hooks.forEach(([h, fn]) => ids.push(Hooks.on(h, fn))));
	onDestroy(() => hooks.forEach(([h], i) => Hooks.off(h, ids[i])));
</script>

{#if active}
	<div class='gm-live'>
		<span class='dot' class:peeking></span>
		<span class='label'>{peeking ? game.i18n.localize('splash.ui.gmLiveControls.hidden') : game.i18n.localize('splash.ui.gmLiveControls.live')}: {name}</span>
		<IconButton
			icon={peeking ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}
			title={peeking ? game.i18n.localize('splash.ui.gmLiveControls.showAgain') : game.i18n.localize('splash.ui.gmLiveControls.minimize')}
			active={peeking}
			onclick={() => togglePeek()}
		/>
		<IconButton
			icon='fa-solid fa-circle-xmark'
			title={game.i18n.localize('splash.ui.gmLiveControls.forceClose')}
			danger
			onclick={() => void forceCloseAllSplashes()}
		/>
	</div>
{/if}

<style lang='scss'>
	// Must sit above the 'full' overlay.
	:global(#splash-gm-controls) {
		position: fixed;
		inset: 0;
		margin: 0;
		padding: 0;
		border: none;
		background: none;
		pointer-events: none;
		z-index: var(--z-index-notification);
	}

	.gm-live {
		pointer-events: auto;
		position: fixed;
		top: 8px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 6px 4px 12px;
		border-radius: 16px;
		background: rgba(20, 20, 24, 0.92);
		border: 1px solid rgba(255, 144, 0, 0.5);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
		font-size: 12px;
		color: #eee;
	}

	.dot {
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

	.label {
		max-width: 240px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
