/**
 * Shared UI types kept in a .ts module so they're importable by consumers (named exports
 *  from .svelte modules aren't visible to tsc).
 */

export interface Tab {
	id: string;
	label: string;
	icon?: string;
	disabled?: boolean;
}

export type ContextMenuItem
	= | { label: string; icon?: string; danger?: boolean; disabled?: boolean; action: () => void }
		| { separator: true };

export function isSeparator(item: ContextMenuItem): item is { separator: true } {
	return 'separator' in item;
}
