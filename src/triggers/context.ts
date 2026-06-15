/** What launched the current splash, exposed to its inline macros as `api.trigger`. */
export interface TriggerContext {
	/** Door/wall uuid. */
	door?: string;
	/** Region uuid. */
	region?: string;
	/** Token uuid. */
	token?: string;
}

let pending: TriggerContext | null = null;

export function setPendingTrigger(context: TriggerContext): void {
	pending = context;
}

/** Reads and clears the pending context; clearing prevents leaking it to a later splash. */
export function consumePendingTrigger(): TriggerContext | null {
	const context = pending;
	pending = null;
	return context;
}
