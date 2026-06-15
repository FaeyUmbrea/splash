<svelte:options runes={true} />
<script lang='ts'>
	import type { PresetKind } from '../../datamodel/PresetModel.ts';
	import type { PresetPayload, PresetSummary } from '../../utils/presets.ts';
	import { onDestroy, onMount } from 'svelte';
	import { allPresets, compendiumPresets, loadPresetPayload } from '../../utils/presets.ts';

	const {
		kind = null,
		title = game.i18n.localize('splash.presets.presetPicker.title'),
		onPick,
		onClose,
	}: {
		/** Restrict to one kind (null shows everything). */
		kind?: PresetKind | null;
		title?: string;
		onPick: (payload: PresetPayload, summary: PresetSummary) => void;
		onClose: () => void;
	} = $props();

	let search = $state('');
	let rev = $state(0);
	let compendium = $state<PresetSummary[]>([]);

	const presets = $derived.by<PresetSummary[]>(() => {
		void rev;
		const world = allPresets(kind ?? undefined);
		const seen = new Set(world.map(p => p.uuid));
		const merged = [...world, ...compendium.filter(p => !seen.has(p.uuid))];
		const q = search.trim().toLowerCase();
		return q ? merged.filter(p => p.name.toLowerCase().includes(q)) : merged;
	});

	async function pick(summary: PresetSummary) {
		const payload = await loadPresetPayload(summary.uuid);
		if (payload) onPick(payload, summary);
		onClose();
	}

	const hooks: [string, () => void][] = [
		['updateJournalEntryPage', () => (rev += 1)],
		['createJournalEntryPage', () => (rev += 1)],
		['deleteJournalEntryPage', () => (rev += 1)],
		['createJournalEntry', () => (rev += 1)],
		['updateJournalEntry', () => (rev += 1)],
		['deleteJournalEntry', () => (rev += 1)],
	];
	const ids: number[] = [];
	onMount(() => {
		hooks.forEach(([h, fn]) => ids.push(Hooks.on(h, fn)));
		void compendiumPresets(kind ?? undefined).then(r => (compendium = r));
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			e.preventDefault();
			onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
	onDestroy(() => hooks.forEach(([h], i) => Hooks.off(h, ids[i])));
</script>

<div class='preset-picker-backdrop' role='presentation' onclick={onClose}>
	<div class='preset-picker' role='dialog' aria-label={title} tabindex='-1' onclick={e => e.stopPropagation()}>
		<header>
			<span class='title'>{title}</span>
			<button type='button' class='x' title={game.i18n.localize('splash.presets.presetPicker.close')} aria-label={game.i18n.localize('splash.presets.presetPicker.close')} onclick={onClose}><i class='fa-solid fa-xmark'></i></button>
		</header>

		<input class='search' type='text' placeholder={game.i18n.localize('splash.presets.presetPicker.searchPlaceholder')} bind:value={search} />

		<div class='list'>
			{#each presets as preset (preset.uuid)}
				<button type='button' class='row' onclick={() => pick(preset)}>
					<img src={preset.img} alt='' />
					<span class='name'>{preset.name}</span>
					<span class='chip'>{preset.kind}</span>
				</button>
			{/each}
			{#if presets.length === 0}
				<div class='empty'>{kind ? game.i18n.format('splash.presets.presetPicker.emptyOfKind', { kind }) : game.i18n.localize('splash.presets.presetPicker.empty')}</div>
			{/if}
		</div>
	</div>
</div>

<style lang='scss'>
	.preset-picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9300;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
	}

	.preset-picker {
		width: 420px;
		max-width: 90vw;
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: #1b1b1e;
		border: 1px solid rgba(255, 144, 0, 0.4);
		border-radius: 6px;
		color: #eee;

		header {
			display: flex;
			align-items: center;
			justify-content: space-between;

			.title {
				font-size: 13px;
				text-transform: uppercase;
				letter-spacing: 0.4px;
				opacity: 0.8;
			}

			.x {
				background: none;
				border: none;
				color: inherit;
				cursor: pointer;
			}
		}
	}

	.search {
		height: 30px;
		padding: 0 8px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		color: inherit;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid transparent;
		border-radius: 4px;
		color: inherit;
		cursor: pointer;
		text-align: left;

		&:hover {
			border-color: rgba(255, 144, 0, 0.5);
		}

		img {
			width: 28px;
			height: 28px;
			object-fit: contain;
			flex: 0 0 auto;
			background: rgba(0, 0, 0, 0.3);
			border-radius: 3px;
		}

		.name {
			flex: 1;
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
			opacity: 0.8;
		}
	}

	.empty {
		padding: 24px 12px;
		text-align: center;
		opacity: 0.5;
		font-size: 12px;
	}
</style>
