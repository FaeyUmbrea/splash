<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectItem } from '../ui';
	import { SplashAPI } from '../../api/api.ts';
	import { Select } from '../ui';
	import FieldsEditor from './FieldsEditor.svelte';

	type Action = Record<string, unknown> & { type?: string };

	const {
		action,
		states,
		onChange,
	}: {
		action: Action | null | undefined;
		/** State keys, for change-state load/unload pickers. */
		states: string[];
		onChange: (action: Action) => void;
	} = $props();

	const api = SplashAPI.getInstance();
	const types = $derived(api.registeredActions);
	const typeOptions = $derived<SelectItem[]>(types.map(t => ({ value: t.type, label: t.name, icon: t.icon })));
	const metaFor = (type?: string) => types.find(t => t.type === type);

	const type = $derived(action?.type ?? '');

	function setType(value: string | string[] | null) {
		const t = value as string;
		onChange(({ type: t, ...(metaFor(t)?.defaults ?? {}) }) as Action);
	}
	function patch(p: Record<string, unknown>) {
		onChange({ ...action, ...p } as Action);
	}
</script>

<div class='action-editor'>
	<Select options={typeOptions} value={type} searchable={false} placeholder={game.i18n.localize('splash.editor.actionEditor.noAction')} onChange={setType} />
	{#if type}
		<FieldsEditor fields={metaFor(type)?.fields ?? []} value={action ?? {}} {states} onChange={patch} />
	{/if}
</div>

<style lang='scss'>
	.action-editor {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
