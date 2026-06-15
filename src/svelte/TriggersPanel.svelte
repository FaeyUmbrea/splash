<svelte:options runes={true} />
<script lang='ts'>
	import type { TriggerBinding } from '../triggers/types.ts';
	import type { SelectItem } from './ui';
	import { onDestroy, onMount } from 'svelte';
	import { SplashAPI } from '../api/api.ts';
	import { grantTriggerVisibility, isSplashPage } from '../utils/launch.ts';
	import { IconButton, Select } from './ui';

	const { splashUuid, splashName }: { splashUuid: string; splashName?: string } = $props();
	const api = SplashAPI.getInstance();

	let bindings = $state<TriggerBinding[]>(api.bindingsForSplash(splashUuid));
	let addType = $state('');

	const triggerTypes: SelectItem[] = api.registeredTriggers.map(t => ({ value: t.type, label: t.label, icon: t.icon }));

	function refresh() {
		bindings = api.bindingsForSplash(splashUuid);
	}

	const hookNames = ['createRegionBehavior', 'deleteRegionBehavior', 'updateWallDocument', 'createWall', 'deleteWall', 'updateScene'];
	const ids: number[] = [];
	onMount(() => hookNames.forEach(h => ids.push(Hooks.on(h, refresh))));
	onDestroy(() => hookNames.forEach((h, i) => Hooks.off(h, ids[i])));

	async function add(type: string | string[] | null) {
		const def = api.getTrigger(type as string);
		addType = '';
		if (!def) return;
		const ok = await def.createBinding(splashUuid);
		if (!ok) return;
		// Firing a splash needs read ownership on its page.
		const page = await fromUuid(splashUuid);
		if (isSplashPage(page)) await grantTriggerVisibility(page);
		refresh();
	}

	async function remove(binding: TriggerBinding) {
		await api.getTrigger(binding.type)?.removeBinding(binding);
		refresh();
	}
</script>

<div class='triggers'>
	<p class='intro'>{game.i18n.localize('splash.ui.triggersPanel.introLead')} <strong>{splashName ?? game.i18n.localize('splash.ui.triggersPanel.thisSplash')}</strong>.</p>

	<Select options={triggerTypes} value={addType} placeholder={game.i18n.localize('splash.ui.triggersPanel.addPlaceholder')} searchable={false} onChange={add} />

	<div class='list'>
		{#each bindings as binding (binding.id)}
			<div class='binding'>
				<i class={api.getTrigger(binding.type)?.icon ?? 'fa-solid fa-bolt'}></i>
				<span class='summary'>{binding.summary}</span>
				<IconButton icon='fa-solid fa-trash' title={game.i18n.localize('splash.ui.triggersPanel.removeTrigger')} danger onclick={() => remove(binding)} />
			</div>
		{/each}
		{#if bindings.length === 0}
			<div class='empty'>{game.i18n.localize('splash.ui.triggersPanel.noTriggers')}</div>
		{/if}
	</div>
</div>

<style lang='scss'>
	.triggers {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px;
	}

	.intro {
		margin: 0;
		font-size: 12px;
		opacity: 0.8;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.binding {
		display: grid;
		grid-template-columns: 18px 1fr 30px;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
		border-radius: 4px;
		font-size: 12px;

		.summary {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.empty {
		padding: 16px;
		text-align: center;
		opacity: 0.5;
		font-size: 12px;
	}
</style>
