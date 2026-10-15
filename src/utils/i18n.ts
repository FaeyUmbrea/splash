/** Resolve a translation at use time, retaining its key before Foundry's translations are ready. */
export function localize(key: string): string {
	return game.i18n?.localize(key) ?? key;
}

/** Format a translation with named values using Foundry's string-valued substitution contract. */
export function format(key: string, values: Record<string, string | number>): string {
	if (!game.i18n) return key;
	const substitutions = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, String(value)]));
	return game.i18n.format(key, substitutions);
}
