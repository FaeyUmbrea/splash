<script lang='ts'>
	import { SplashAPI } from '../api/api.ts';

	export let pages: { uuid: string; name: string; journal: string }[];

	const api = SplashAPI.getInstance();
	const isGM = game.user?.isGM ?? false;
</script>

<div class='splash-quick-access'>
	{#if pages.length === 0}
		<p class='hint'>No splash pages available. Create a "Splash" journal page first.</p>
	{:else}
		<ul>
			{#each pages as page (page.uuid)}
				<li>
					<span class='name'>{page.name}</span>
					<span class='journal'>{page.journal}</span>
					<button type='button' title='Show (only me)' on:click={() => api.show(page.uuid)}>
						<i class='fas fa-eye'></i>
					</button>
					<button type='button' title='Show for everyone' on:click={() => api.show(page.uuid, { broadcast: true })}>
						<i class='fas fa-tower-broadcast'></i>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<footer>
		<button type='button' on:click={() => api.close()}>Close splash</button>
		{#if isGM}
			<button type='button' on:click={() => api.close({ broadcast: true })}>Close everywhere</button>
		{/if}
	</footer>
</div>

<style lang='scss'>
	.splash-quick-access {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;

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

		footer {
			display: flex;
			gap: 0.5rem;
		}
	}
</style>
