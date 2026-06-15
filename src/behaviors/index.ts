import type { SpriteCreate } from '../datamodel/SplashModel.ts';

/** One input prompted in a behavior's placement dialog. */
export interface BehaviorField {
	key: string;
	label: string;
	type: 'text' | 'number';
	default?: string | number;
}

/** A code-registered prefab that prompts for config, then generates a self-contained sprite group; the result keeps no dependency back to the behavior. */
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
