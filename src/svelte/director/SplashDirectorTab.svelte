<svelte:options runes={true} />
<script lang='ts'>
	import type { SplashPage } from '../../utils/launch.ts';
	import { onDestroy, onMount } from 'svelte';
	import { broadcastSpectate } from '../../compat/obsUtils.ts';
	import { allSplashPages } from '../../utils/discovery.ts';
	import { getPresences } from '../../utils/presence.ts';
	import { broadcastCloseHandout, broadcastOpenHandout } from '../../utils/socket.ts';

	const { disabled = false }: { disabled?: boolean } = $props();

	let rev = $state(0);
	let streamedUuid = $state<string | null>(null);
	let spectatingId = $state<string | null>(null);

	const handouts = $derived.by<SplashPage[]>(() => {
		void rev;
		return allSplashPages().filter(p => p.system.layer === 'handout');
	});

	const spectatable = $derived.by(() => {
		void rev;
		return [...getPresences()].map(([userId, p]) => ({
			userId,
			userName: game.users?.get(userId)?.name ?? userId,
			splashName: (fromUuidSync(p.uuid) as { name?: string } | null)?.name ?? '',
		}));
	});

	const obsUserId = $derived.by<string | null>(() => {
		void rev;
		return game.modules?.get('obs-utils')?.api?.getDirectorState().obsModeUserId ?? null;
	});
	const obsUserName = $derived(obsUserId ? (game.users?.get(obsUserId)?.name ?? obsUserId) : null);
	const canStream = $derived(!disabled && !!obsUserId);

	function show(page: SplashPage) {
		if (!obsUserId) return;
		broadcastOpenHandout(page.uuid, obsUserId);
		streamedUuid = page.uuid;
	}
	function clear() {
		if (!obsUserId || !streamedUuid) return;
		broadcastCloseHandout(streamedUuid, obsUserId);
		streamedUuid = null;
	}
	function spectate(userId: string) {
		if (!obsUserId) return;
		broadcastSpectate(userId, obsUserId);
		spectatingId = userId;
	}
	function stopSpectate() {
		if (!obsUserId) return;
		broadcastSpectate(null, obsUserId);
		spectatingId = null;
	}

	const hooks: [string, (...a: unknown[]) => void][] = [
		['updateJournalEntryPage', () => (rev += 1)],
		['createJournalEntryPage', () => (rev += 1)],
		['deleteJournalEntryPage', () => (rev += 1)],
		['splash.presence-changed', () => (rev += 1)],
		['obs-utils.director.stateChanged', () => (rev += 1)],
	];
	const ids: number[] = [];
	onMount(() => hooks.forEach(([h, fn]) => ids.push(Hooks.on(h, fn))));
	onDestroy(() => hooks.forEach(([h], i) => Hooks.off(h, ids[i])));
</script>

<div class='splash-director'>
	<p class='obs-user' class:warn={!obsUserName}>
		{#if obsUserName}
			{game.i18n.format('splash.director.streamingTo', { user: obsUserName })}
		{:else}
			{game.i18n.localize('splash.director.noObsUser')}
		{/if}
	</p>

	<header>{game.i18n.localize('splash.director.handouts')}</header>
	<div class='list'>
		{#each handouts as page (page.uuid)}
			<div class='row' class:active={streamedUuid === page.uuid}>
				<span class='name'>{page.name}</span>
				<button type='button' disabled={!canStream} onclick={() => show(page)}>
					{game.i18n.localize('splash.director.showOnStream')}
				</button>
			</div>
		{/each}
		{#if handouts.length === 0}
			<div class='empty'>{game.i18n.localize('splash.director.noHandouts')}</div>
		{/if}
	</div>
	<button type='button' class='clear' disabled={!canStream || !streamedUuid} onclick={clear}>
		{game.i18n.localize('splash.director.clearStream')}
	</button>

	<header>{game.i18n.localize('splash.director.spectate')}</header>
	<div class='list'>
		{#each spectatable as p (p.userId)}
			<div class='row' class:active={spectatingId === p.userId}>
				<span class='name'>{p.userName}{#if p.splashName} · {p.splashName}{/if}</span>
				<button type='button' disabled={!canStream} onclick={() => spectate(p.userId)}>
					{game.i18n.localize('splash.director.spectateUser')}
				</button>
			</div>
		{/each}
		{#if spectatable.length === 0}
			<div class='empty'>{game.i18n.localize('splash.director.noPresence')}</div>
		{/if}
	</div>
	<button type='button' class='clear' disabled={!canStream || !spectatingId} onclick={stopSpectate}>
		{game.i18n.localize('splash.director.stopSpectate')}
	</button>
</div>

<style lang='scss'>
	.splash-director {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
	}

	.obs-user {
		margin: 0;
		font-size: 12px;
		opacity: 0.8;

		&.warn {
			opacity: 1;
			color: #e0a030;
		}
	}

	header {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		opacity: 0.7;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 6px;
		border: 1px solid transparent;
		border-radius: 4px;

		&.active {
			background: rgba(255, 144, 0, 0.18);
			border-color: rgba(255, 144, 0, 0.5);
		}

		.name {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.empty {
		padding: 14px 4px;
		text-align: center;
		font-size: 12px;
		opacity: 0.5;
	}
</style>
