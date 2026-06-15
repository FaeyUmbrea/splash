/**
 * What launched the current splash, handed to its inline macros as `api.trigger` (e.g. `{ door }`).
 * A trigger sets it immediately before calling `launch`; SplashUI consumes it once at runtime creation,
 * so a later launch can't make it stale.
 */
export interface TriggerContext {
	/** The wall/door uuid that launched this splash, if a door trigger. */
	door?: string;
	/** The region uuid, if a region trigger. */
	region?: string;
	/** The token uuid that entered, if applicable. */
	token?: string;
}

let pending: TriggerContext | null = null;

/** A trigger calls this right before `launch(uuid)`. */
export function setPendingTrigger(context: TriggerContext): void {
	pending = context;
}

/** SplashUI calls this once at runtime creation; clears it so it can't leak to a later splash. */
export function consumePendingTrigger(): TriggerContext | null {
	const context = pending;
	pending = null;
	return context;
}
