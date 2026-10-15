import type { IncrementValueActionInitialized } from '../datamodel/SplashModel.ts';

/** Increment a stored value using the authored bounds and wrap rules in either local or shared playback. */
export function incrementValue(current: unknown, { step, min, max, wrap }: Pick<IncrementValueActionInitialized, 'step' | 'min' | 'max' | 'wrap'>): number {
	let next = Number(current ?? 0) + (step ?? 1);
	if (wrap && min != null && max != null) {
		if (next > max) next = min;
		if (next < min) next = max;
	} else {
		if (max != null) next = Math.min(next, max);
		if (min != null) next = Math.max(next, min);
	}
	return next;
}
