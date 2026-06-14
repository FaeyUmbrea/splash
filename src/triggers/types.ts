/** A live trigger binding — one source (region/door/…) wired to launch a splash. */
export interface TriggerBinding {
	/** Stable id for removal (the behavior uuid, the wall uuid, …). */
	id: string;
	type: string;
	splashUuid: string;
	/** Human summary for the triggers list, e.g. `Region "Crypt" in "Dungeon"`. */
	summary: string;
	sceneId?: string;
}

/** A registered trigger type. First-party triggers are registered through the same API third parties use. */
export interface TriggerDefinition {
	type: string;
	label: string;
	icon: string;
	/** Interactively wire a new binding for a splash (pick a region/door). Resolves true on success. */
	createBinding: (splashUuid: string) => Promise<boolean>;
	/** Every live binding of this type, world-wide. */
	listBindings: () => TriggerBinding[];
	/** Tear a binding down. */
	removeBinding: (binding: TriggerBinding) => Promise<void>;
}

export type TriggerOptions = Omit<TriggerDefinition, 'type' | 'label'>;
