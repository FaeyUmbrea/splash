/** Must match MAX_BANDS in the shared shader lib. */
export const MAX_BANDS = 16;

/** Tear-pattern reroll interval. Stepped motion reads as digital. */
export const REROLL_MS = 90;

/** Bands partition the y axis and tear along x. */
export function rollBands(table: Float32Array, height: number, maxTear: number, maxBands: number): number {
	const numBands = Math.min(3 + Math.floor(Math.random() * Math.max(maxBands - 2, 1)), MAX_BANDS);
	for (let i = 0; i < numBands; i++) {
		const start = Math.random() * height;
		const bandHeight = 6 + Math.random() * 50;
		table[i * 3] = start;
		table[i * 3 + 1] = start + bandHeight;
		table[i * 3 + 2] = (Math.random() * 2 - 1) * maxTear;
	}
	return numBands;
}
