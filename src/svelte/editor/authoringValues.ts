import type { EditorDraft } from './editorData.ts';

/** Collect value names already used by the handout's data bindings, actions and conditions. */
export function discoverValueKeys(splash: EditorDraft): string[] {
	const keys = new Set(Object.keys(splash.values ?? {}));
	/** Include named values referenced by one action without treating unrelated text as a key. */
	function visitAction(action: unknown): void {
		if (!action || typeof action !== 'object') return;
		const record = action as Record<string, unknown>;
		if ((record.type === 'set-value' || record.type === 'increment-value') && typeof record.key === 'string' && record.key.trim()) keys.add(record.key);
		if (record.conditions && typeof record.conditions === 'object') {
			for (const key of Object.keys(record.conditions)) {
				if (key.trim()) keys.add(key);
			}
		}
	}
	for (const state of Object.values(splash.states ?? {})) {
		for (const action of state?.onEnter ?? []) visitAction(action);
	}
	for (const sprite of splash.children ?? []) {
		if (!sprite) continue;
		const record = sprite as Record<string, unknown>;
		if (typeof record.valueKey === 'string' && record.valueKey.trim()) keys.add(record.valueKey);
		visitAction(record.onClick);
		visitAction(record.onDrop);
	}
	return [...keys].sort((a, b) => a.localeCompare(b));
}
