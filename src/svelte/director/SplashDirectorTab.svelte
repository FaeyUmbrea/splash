<svelte:options runes={true} />
<script lang='ts'>
	import { onDestroy, onMount } from 'svelte';
	import { broadcastClearStream } from '../../compat/obsUtils.ts';
	import { ID } from '../../utils/const.js';
	import { SETTING_SPECTATED_USER } from '../../utils/settings.ts';

	const { disabled = false }: { disabled?: boolean } = $props();

	let rev = $state(0);

	// The mirrored player is a world setting, so it persists and the OBS client reads it on connect.
	const spectated = $derived.by<string | null>(() => {
		void rev;
		return (game.settings?.get(ID, SETTING_SPECTATED_USER) as string) || null;
	});

	// Every user — players and DMs — can be set as the mirror target; the world setting persists until
	// they open a splash. Online status isn't shown here; Foundry's player list already covers that.
	const players = $derived.by(() => {
		void rev;
		return (game.users?.contents ?? [])
			.map(u => ({ userId: u.id as string, userName: u.name as string }));
	});

	function mirror(userId: string) {
		void game.settings?.set(ID, SETTING_SPECTATED_USER, userId);
	}
	function stop() {
		void game.settings?.set(ID, SETTING_SPECTATED_USER, '');
	}
	function clearAll() {
		void game.settings?.set(ID, SETTING_SPECTATED_USER, '');
		broadcastClearStream();
	}

	const hooks: [string, (...a: unknown[]) => void][] = [
		['splash.spectated-changed', () => (rev += 1)],
	];
	const ids: number[] = [];
	onMount(() => hooks.forEach(([h, fn]) => ids.push(Hooks.on(h, fn))));
	onDestroy(() => hooks.forEach(([h], i) => Hooks.off(h, ids[i])));
</script>

<div class='splash-director'>
	<header class='hdr'>
		<b>{game.i18n.localize('splash.director.spectate')}</b>
		<button type='button' class='clear-all' title={game.i18n.localize('splash.director.clearAll')} onclick={clearAll}>
			<i class='fa-solid fa-ban'></i>
		</button>
	</header>
	{#if players.length}
		<ul class='list'>
			{#each players as p (p.userId)}
				{@const watching = spectated === p.userId}
				<li class='row' class:active={watching}>
					<span class='name' title={p.userName}>{p.userName}</span>
					<button
						type='button'
						class='act'
						class:on={watching}
						{disabled}
						title={game.i18n.localize(watching ? 'splash.director.stopSpectate' : 'splash.director.spectateUser')}
						onclick={() => (watching ? stop() : mirror(p.userId))}
					>
						<i class={watching ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<div class='empty'>{game.i18n.localize('splash.director.noPlayers')}</div>
	{/if}
</div>

<style lang='scss'>
	.splash-director {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;

		b {
			font-size: 12px;
		}
	}

	.hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;

		.clear-all {
			width: 24px;
			height: 22px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(255, 255, 255, 0.05);
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 3px;
			cursor: pointer;

			&:hover {
				background: rgba(220, 70, 70, 0.25);
				border-color: rgba(220, 70, 70, 0.6);
			}
		}
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
		align-items: center;
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 4px;

		&.active {
			background: rgba(255, 144, 0, 0.12);
			border-color: rgba(255, 144, 0, 0.4);
		}

		.name {
			font-size: 12px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.act {
			width: 28px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(255, 144, 0, 0.18);
			border: 1px solid rgba(255, 144, 0, 0.45);
			border-radius: 3px;
			cursor: pointer;

			&:hover {
				background: rgba(255, 144, 0, 0.3);
				border-color: rgba(255, 144, 0, 0.7);
			}

			&.on {
				background: rgba(255, 255, 255, 0.06);
				border-color: rgba(255, 255, 255, 0.18);
			}
		}
	}

	.empty {
		padding: 10px 4px;
		text-align: center;
		font-size: 12px;
		opacity: 0.5;
	}
</style>
