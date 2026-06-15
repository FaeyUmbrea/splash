<svelte:options runes={true} />
<script lang='ts'>
	import type { SplashPage } from '../../utils/launch.ts';
	import type { PresetSummary } from '../../utils/presets.ts';
	import type { ContextMenuItem, SelectItem, Tab } from '../ui';
	import { onDestroy, onMount } from 'svelte';
	import { availableActions, runSplashAction } from '../../sheet/splashActions.ts';
	import { allSplashPages, createSplashPage } from '../../utils/discovery.ts';
	import { allPresets } from '../../utils/presets.ts';
	import { ContextMenu, IconButton, ListRow, Select, Tabs, TextField } from '../ui';

	function escapeHtml(s: string): string {
		return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c] ?? c));
	}

	const layerMeta: Record<string, { label: string; icon: string }> = {
		scene: { label: 'Scene', icon: 'fa-solid fa-layer-group' },
		hud: { label: 'HUD', icon: 'fa-solid fa-table-columns' },
		full: { label: 'Full', icon: 'fa-solid fa-expand' },
		handout: { label: 'Handout', icon: 'fa-solid fa-window-maximize' },
	};

	let pages = $state<SplashPage[]>(allSplashPages());
	let presets = $state<PresetSummary[]>(allPresets());
	let view = $state<'splashes' | 'presets'>('splashes');
	let search = $state('');
	let groupBy = $state<'journal' | 'kind'>('journal');
	let menu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	let creating = $state(false);
	let newName = $state('');
	let newLayer = $state('full');
	let newJournalId = $state('');

	function refresh() {
		pages = allSplashPages();
		presets = allPresets();
	}

	const primaryTabs: Tab[] = [
		{ id: 'splashes', label: 'Splashes', icon: 'fa-solid fa-images' },
		{ id: 'presets', label: 'Presets', icon: 'fa-solid fa-swatchbook' },
	];

	const filteredPresets = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return presets.filter(p => !q || p.name.toLowerCase().includes(q));
	});

	async function renamePreset(preset: PresetSummary) {
		const name = await foundry.applications.api.DialogV2.prompt({
			window: { title: 'Rename preset' },
			content: `<input type="text" name="name" value="${escapeHtml(preset.name)}" style="width:100%" autofocus />`,
			ok: { label: 'Rename', callback: (_event: unknown, button: { form: HTMLFormElement }) => (button.form.elements.namedItem('name') as HTMLInputElement)?.value },
		}).catch(() => null);
		if (name == null) return;
		const page = await fromUuid(preset.uuid);
		await page?.update({ name: String(name).trim() || preset.name });
	}

	async function deletePreset(preset: PresetSummary) {
		const ok = await foundry.applications.api.DialogV2.confirm({
			window: { title: 'Delete preset' },
			content: `<p>Delete preset "<strong>${escapeHtml(preset.name)}</strong>"? This cannot be undone.</p>`,
		}).catch(() => false);
		if (!ok) return;
		const page = await fromUuid(preset.uuid);
		await page?.delete();
	}

	const hookNames = ['createJournalEntryPage', 'updateJournalEntryPage', 'deleteJournalEntryPage', 'createJournalEntry', 'deleteJournalEntry'];
	const hookIds: number[] = [];
	onMount(() => {
		for (const h of hookNames) hookIds.push(Hooks.on(h, refresh));
	});
	onDestroy(() => {
		hookNames.forEach((h, i) => Hooks.off(h, hookIds[i]));
	});

	const groupTabs: Tab[] = [
		{ id: 'journal', label: 'By journal', icon: 'fa-solid fa-book' },
		{ id: 'kind', label: 'By kind', icon: 'fa-solid fa-shapes' },
	];

	const layerOptions: SelectItem[] = [
		{ value: 'full', label: 'Full splash' },
		{ value: 'scene', label: 'Scene splash' },
		{ value: 'hud', label: 'HUD splash' },
		{ value: 'handout', label: 'Handout' },
	];
	const journalOptions = $derived<SelectItem[]>([
		{ value: '', label: 'Splashes and Handouts (default)' },
		...(game.journal?.contents ?? []).map(j => ({ value: j.id as string, label: j.name as string })),
	]);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return pages.filter(p => !q || (p.name ?? '').toLowerCase().includes(q) || (p.parent?.name ?? '').toLowerCase().includes(q));
	});

	const groups = $derived.by(() => {
		const byKey: Record<string, SplashPage[]> = {};
		for (const p of filtered) {
			const key = groupBy === 'journal' ? (p.parent?.name ?? 'Ungrouped') : (layerMeta[p.system.layer]?.label ?? p.system.layer);
			(byKey[key] ??= []).push(p);
		}
		return Object.entries(byKey).sort((a, b) => a[0].localeCompare(b[0]));
	});

	async function create() {
		const page = await createSplashPage({ name: newName, layer: newLayer, journalId: newJournalId || null });
		creating = false;
		newName = '';
		if (page) runSplashAction('edit', page);
	}

	async function duplicate(page: SplashPage) {
		const data = page.toObject();
		delete (data as { _id?: string })._id;
		data.name = `${page.name} copy`;
		await page.parent?.createEmbeddedDocuments('JournalEntryPage', [data]);
	}

	async function remove(page: SplashPage) {
		const ok = await foundry.applications.api.DialogV2.confirm({
			window: { title: 'Delete splash' },
			content: `<p>Delete "<strong>${page.name}</strong>"? This cannot be undone.</p>`,
		}).catch(() => false);
		if (ok) await page.delete();
	}

	function togglePin(page: SplashPage) {
		const scene = canvas?.scene;
		if (!scene) return;
		const pins = [...(page.system.scenePins ?? [])];
		const i = pins.indexOf(scene.id);
		if (i >= 0) pins.splice(i, 1);
		else pins.push(scene.id);
		void page.update({ 'system.scenePins': pins });
	}

	function rowMenu(event: MouseEvent, page: SplashPage) {
		event.preventDefault();
		event.stopPropagation();
		const pinned = Array.from(page.system.scenePins ?? []).includes(canvas?.scene?.id ?? '');
		const items: ContextMenuItem[] = [
			...availableActions(page).map(a => ({ label: a.label.startsWith('splash.') ? game.i18n.localize(a.label) : a.label, icon: a.icon, disabled: a.disabled, action: () => runSplashAction(a.action, page) })),
			{ separator: true },
			{ label: page.system.global ? 'Unset global' : 'Set global', icon: 'fa-solid fa-globe', action: () => void page.update({ 'system.global': !page.system.global }) },
			{ label: pinned ? 'Unpin from scene' : 'Pin to current scene', icon: 'fa-solid fa-thumbtack', disabled: !canvas?.scene, action: () => togglePin(page) },
			{ label: 'Duplicate', icon: 'fa-solid fa-clone', action: () => duplicate(page) },
			{ separator: true },
			{ label: 'Delete', icon: 'fa-solid fa-trash', danger: true, action: () => remove(page) },
		];
		menu = { x: event.clientX, y: event.clientY, items };
	}

	function primaryAction(event: MouseEvent, page: SplashPage) {
		event.stopPropagation();
		runSplashAction(page.system.layer === 'handout' ? 'open-handout' : 'launch', page);
	}
</script>

<div class='manager'>
	<Tabs tabs={primaryTabs} bind:value={view} />

	{#if view === 'splashes'}
		<header class='toolbar'>
			<div class='search'>
				<i class='fa-solid fa-magnifying-glass'></i>
				<input type='text' placeholder='Search splashes…' bind:value={search} />
			</div>
			<Tabs tabs={groupTabs} bind:value={groupBy} />
			<IconButton icon='fa-solid fa-plus' title='New splash' active={creating} onclick={() => (creating = !creating)} />
		</header>

		{#if creating}
			<div class='create'>
				<TextField label='Name' bind:value={newName} placeholder='New Splash' />
				<div class='create-row'>
					<label class='lbl'>Kind <Select options={layerOptions} bind:value={newLayer} searchable={false} /></label>
					<label class='lbl'>Journal <Select options={journalOptions} bind:value={newJournalId} /></label>
				</div>
				<div class='create-actions'>
					<button type='button' class='ghost' onclick={() => (creating = false)}>Cancel</button>
					<button type='button' class='primary' onclick={create}>Create &amp; edit</button>
				</div>
			</div>
		{/if}

		<div class='list'>
			{#each groups as [groupName, groupPages] (groupName)}
				<div class='group-head'>{groupName} <span class='count'>{groupPages.length}</span></div>
				{#each groupPages as page (page.uuid)}
					<ListRow columns='22px 1fr auto auto' onclick={() => runSplashAction('edit', page)} oncontextmenu={e => rowMenu(e, page)}>
						<i class={layerMeta[page.system.layer]?.icon ?? 'fa-solid fa-image'} title={layerMeta[page.system.layer]?.label}></i>
						<span class='name'>{page.name}</span>
						<span class='chips'>
							{#if page.system.global}<span class='chip'>global</span>{/if}
							{#if page.system.mode === 'synced'}<span class='chip'>synced</span>{/if}
							<span class='chip layer'>{layerMeta[page.system.layer]?.label ?? page.system.layer}</span>
						</span>
						<span class='row-actions'>
							<IconButton icon={page.system.layer === 'handout' ? 'fa-solid fa-window-maximize' : 'fa-solid fa-play'} title='Launch' onclick={e => primaryAction(e, page)} />
							<IconButton icon='fa-solid fa-ellipsis-vertical' title='More' onclick={e => rowMenu(e, page)} />
						</span>
					</ListRow>
				{/each}
			{/each}
			{#if filtered.length === 0}
				<div class='empty'>No splashes{search ? ' match your search' : ' yet — use + to create one'}.</div>
			{/if}
		</div>
	{:else}
		<header class='toolbar'>
			<div class='search'>
				<i class='fa-solid fa-magnifying-glass'></i>
				<input type='text' placeholder='Search presets…' bind:value={search} />
			</div>
		</header>

		<div class='list'>
			{#each filteredPresets as preset (preset.uuid)}
				<ListRow columns='28px 1fr auto auto'>
					<img class='preset-thumb' src={preset.img} alt='' />
					<span class='name'>{preset.name}</span>
					<span class='chip'>{preset.kind}</span>
					<span class='row-actions'>
						<IconButton icon='fa-solid fa-pen' title='Rename' onclick={() => renamePreset(preset)} />
						<IconButton icon='fa-solid fa-trash' title='Delete' danger onclick={() => deletePreset(preset)} />
					</span>
				</ListRow>
			{/each}
			{#if filteredPresets.length === 0}
				<div class='empty'>No presets{search ? ' match your search' : ' yet — save one from the splash editor'}.</div>
			{/if}
		</div>
	{/if}
</div>

{#if menu}
	<ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => (menu = null)} />
{/if}

<style lang='scss'>
	.manager {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 8px;
		padding: 8px;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 8px;

		.search {
			flex: 1;
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 0 8px;
			height: 32px;
			background: rgba(0, 0, 0, 0.25);
			border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
			border-radius: 4px;

			input {
				flex: 1;
				background: none;
				border: none;
				color: inherit;
				outline: none;
			}
		}
	}

	.create {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
		border-radius: 4px;

		.create-row {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}

		.lbl {
			display: flex;
			flex-direction: column;
			gap: 4px;
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.4px;
			opacity: 0.7;
		}

		.create-actions {
			display: flex;
			justify-content: flex-end;
			gap: 8px;

			button {
				height: 30px;
				padding: 0 14px;
				border-radius: 4px;
				cursor: pointer;
				border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15));
				background: transparent;
				color: inherit;

				&.primary {
					background: rgba(255, 144, 0, 0.2);
					border-color: rgba(255, 144, 0, 0.5);
				}
			}
		}
	}

	.list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.group-head {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 4px 2px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		opacity: 0.55;

		.count {
			opacity: 0.6;
		}
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chips {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.chip {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.1);
		text-transform: uppercase;
		letter-spacing: 0.3px;

		&.layer {
			background: rgba(255, 144, 0, 0.18);
		}
	}

	.row-actions {
		display: flex;
		gap: 4px;
	}

	.preset-thumb {
		width: 28px;
		height: 28px;
		object-fit: contain;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.25);
	}

	.empty {
		padding: 24px;
		text-align: center;
		opacity: 0.5;
		font-size: 12px;
	}
</style>
