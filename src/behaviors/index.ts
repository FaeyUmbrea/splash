import type { SpriteCreate } from '../datamodel/SplashModel.ts';

/** One input prompted in a behavior's placement dialog. */
export interface BehaviorField {
	key: string;
	label: string;
	type: 'text' | 'number';
	default?: string | number;
}

/**
 * A predefined, parametric prefab: registered in code (not authored by end users), it asks for a few
 * config values, then GENERATES a self-contained group of sprites with inline macros. The result is a
 * plain splash that carries no dependency back to the behavior — it only runs at drop time.
 */
export interface PrefabBehavior {
	key: string;
	label: string;
	icon: string;
	fields: BehaviorField[];
	/** Build the sprites to drop into the splash, placed in `stateKey`. */
	build: (config: Record<string, unknown>, ctx: { stateKey: string }) => SpriteCreate[];
}

const behaviors = new Map<string, PrefabBehavior>();

export function registerBehavior(behavior: PrefabBehavior): void {
	behaviors.set(behavior.key, behavior);
}

export function allBehaviors(): PrefabBehavior[] {
	return [...behaviors.values()];
}

export function getBehavior(key: string): PrefabBehavior | undefined {
	return behaviors.get(key);
}

/** Register the first-party behaviors. Called once at init. */
export async function registerBuiltinBehaviors(): Promise<void> {
	const { tumblerLock } = await import('./tumblerLock.ts');
	registerBehavior(tumblerLock);
}
