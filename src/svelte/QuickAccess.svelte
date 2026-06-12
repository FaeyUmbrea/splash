<script lang='ts'>
	import type { ActiveSplash, SplashLayer } from '../utils/settings.ts';
	import { onDestroy } from 'svelte';
	import { SplashAPI } from '../api/api.ts';
	import { isPeeking, killGlobalSplash, togglePeek } from '../apps/controller.ts';
	import { getPresences } from '../utils/presence.ts';
	import { getActiveSplash } from '../utils/settings.ts';
	import { clearVotes, getAllVotes, getRuntime, getVotes } from '../utils/sync.ts';

	export let pages: { uuid: string; name: string; journal: string }[];

	const api = SplashAPI.getInstance();
	const isGM = game.user?.isGM ?? false;

	let layer: SplashLayer = 'scene';
	let active: ActiveSplash | null = getActiveSplash();
	let peeking = isPeeking();
	let presences = isGM ? [...getPresences().entries()] : [];
	let voteBoard: Record<string, Record<string, { count: number; voters: string[] }>> = isGM ? getAllVotes() : {};

	const activeHook = Hooks.on('splash.active-changed', (value: ActiveSplash | null) => {
		active = value;
		peeking = isPeeking();
	});
	const presenceHook = Hooks.on('splash.presence-changed', () => {
		presences = [...getPresences().entries()];
	});
	const votesHook = Hooks.on('splash.votes-changed', (uuid: string) => {
		voteBoard = { ...voteBoard, [uuid]: getVotes(uuid) };
	});
	onDestroy(() => {
		Hooks.off('splash.active-changed', activeHook);
		Hooks.off('splash.presence-changed', presenceHook);
		Hooks.off('splash.votes-changed', votesHook);
	});

	$: activeName = active ? (fromUuidSync(active.uuid)?.name ?? active.uuid) : null;

	function peek() {
		peeking = togglePeek();
	}

	const userName = (id: string) => game.users?.get(id)?.name ?? id;
	const pageName = (uuid: string) => fromUuidSync(uuid)?.name ?? uuid;

	/** Open the splash locally and jump to the player's reported position. */
	async function spectate(uuid: string, snapshot: { loadedStates: string[]; values: Record<string, unknown> }) {
		await api.openHandout(uuid);
		// The handout's runtime finishes mounting asynchronously after render.
		setTimeout(() => getRuntime(uuid)?.applyShared(snapshot), 800);
	}
</script>

<div class='splash-quick-access'>
	{#if isGM && active}
		<section class='active'>
			<span class='label'>Showing:</span>
			<span class='name'>{activeName}</span>
			<span class='layer'>({active.layer})</span>
			<button type='button' title={peeking ? 'Stop peeking' : 'Peek behind (only you)'} on:click={peek}>
				<i class='fas {peeking ? 'fa-eye' : 'fa-eye-slash'}'></i>
			</button>
			<button type='button' title='Close for everyone' on:click={() => killGlobalSplash()}>
				<i class='fas fa-ban'></i>
			</button>
		</section>
	{/if}

	{#if isGM}
		<label class='layer-pick'>
			Layer
			<select bind:value={layer}>
				<option value='scene'>Scene (UI stays visible)</option>
				<option value='hud'>HUD (hides scene chrome)</option>
				<option value='full'>Full (covers everything)</option>
			</select>
		</label>
	{/if}

	{#if pages.length === 0}
		<p class='hint'>No splash pages available. Create a "Splash" journal page first.</p>
	{:else}
		<ul>
			{#each pages as page (page.uuid)}
				<li>
					<span class='name'>{page.name}</span>
					<span class='journal'>{page.journal}</span>
					<button type='button' title='Show (only me)' on:click={() => api.show(page.uuid, { layer })}>
						<i class='fas fa-eye'></i>
					</button>
					{#if isGM}
						<button type='button' title='Splash for everyone (persists)' on:click={() => api.show(page.uuid, { layer, global: true })}>
							<i class='fas fa-tower-broadcast'></i>
						</button>
					{/if}
					<button type='button' title='Open as handout window' on:click={() => api.openHandout(page.uuid)}>
						<i class='fas fa-window-restore'></i>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if isGM && presences.length > 0}
		<section class='presence'>
			<h3>Players exploring</h3>
			{#each presences as [userId, presence] (userId)}
				<div class='row'>
					<span class='name'>{userName(userId)}</span>
					<span class='detail'>{pageName(presence.uuid)}: {presence.snapshot.loadedStates.join(', ')}</span>
					<button type='button' title='Spectate' on:click={() => spectate(presence.uuid, presence.snapshot)}>
						<i class='fas fa-binoculars'></i>
					</button>
				</div>
			{/each}
		</section>
	{/if}

	{#if isGM && Object.keys(voteBoard).length > 0}
		<section class='votes'>
			<h3>Votes</h3>
			{#each Object.entries(voteBoard) as [uuid, tallies] (uuid)}
				<div class='row'>
					<span class='name'>{pageName(uuid)}</span>
					<span class='detail'>
						{#each Object.entries(tallies) as [option, tally] (option)}
							<span title={tally.voters.join(', ')}>{option}: {tally.count}</span>
						{/each}
					</span>
					<button type='button' title='Reset votes' on:click={() => clearVotes(uuid)}>
						<i class='fas fa-rotate-left'></i>
					</button>
				</div>
			{/each}
		</section>
	{/if}

	<footer>
		<button type='button' on:click={() => api.close()}>Close splash (only me)</button>
	</footer>
</div>

<style lang='scss'>
	.splash-quick-access {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;

		.active {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.25rem 0.5rem;
			border: 1px solid var(--color-border-highlight, #ff6400);
			border-radius: 4px;

			.name {
				font-weight: bold;
			}

			.layer {
				flex: 1;
				opacity: 0.7;
			}

			button {
				flex: 0 0 2rem;
				line-height: 1.5;
			}
		}

		.layer-pick {
			display: flex;
			align-items: center;
			gap: 0.5rem;

			select {
				flex: 1;
			}
		}

		ul {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		li {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.25rem 0;

			.name {
				font-weight: bold;
			}

			.journal {
				flex: 1;
				opacity: 0.7;
				font-size: 0.9em;
			}

			button {
				flex: 0 0 2rem;
				line-height: 1.5;
			}
		}

		.presence,
		.votes {
			h3 {
				margin: 0 0 0.25rem;
				font-size: 0.9rem;
				border: none;
			}

			.row {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				font-size: 0.85em;

				.name {
					font-weight: bold;
				}

				.detail {
					flex: 1;
					opacity: 0.8;
					display: flex;
					gap: 0.5rem;
				}

				button {
					flex: 0 0 2rem;
					line-height: 1.5;
				}
			}
		}

		footer {
			display: flex;
			gap: 0.5rem;
		}
	}
</style>
