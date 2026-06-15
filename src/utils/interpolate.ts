/** Replace `{key}` tokens with values. Keys may be namespaced, e.g. vote:castle. */
export function interpolate(text: string, values: Record<string, unknown>): string {
	return text.replace(/\{([\w:.-]+)\}/g, (token, key) => (key in values ? String(values[key]) : token));
}
