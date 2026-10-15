/** Fallback size for sprites without explicit dimensions; must match the PIXI renderer's defaults. */
export function spriteDefaultSize(type: string | null | undefined): { width?: number; height?: number } {
	if (type === 'button') return { width: 400, height: 200 };
	if (type === 'panel') return { width: 200, height: 200 };
	if (type === 'gauge') return { width: 300, height: 40 };
	if (type === 'hotspot') return { width: 200, height: 200 };
	if (type === 'text-input') return { width: 240, height: 40 };
	if (type === 'draggable') return { width: 100, height: 100 };
	if (type === 'drop-zone') return { width: 120, height: 120 };
	return {};
}
