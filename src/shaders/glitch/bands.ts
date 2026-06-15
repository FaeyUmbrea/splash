/** Must match MAX_BANDS in the shared shader lib. */
export const MAX_BANDS = 16;

/** How often tear patterns jump; stepped motion reads as digital, smooth reads as wobble. */
export const REROLL_MS = 90;

/** Roll a random band table; bands partition the y axis and tear along x. */
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
