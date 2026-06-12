/** Replace `{key}` tokens in display text with the runtime's current values. */
export function interpolate(text: string, values: Record<string, unknown>): string {
	return text.replace(/\{([\w-]+)\}/g, (token, key) => (key in values ? String(values[key]) : token));
}
