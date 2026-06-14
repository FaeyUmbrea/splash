import type { SpriteCreate, StateDefinitionCreate } from '../../datamodel/SplashModel.ts';
import type { SplashPage } from '../../utils/launch.ts';

/**
 * Atomic write helpers for the editor. Each call is one granular `document.update()` —
 * no working copy, no save button. Multiplayer-correct: the resulting `updateJournalEntryPage`
 * re-publishes the editor's read-mirror (see DocumentStore), which is the single source of truth.
 */

/** Write one splash-level field by dotted path, e.g. `setField(page, 'layer', 'handout')`. */
export function setField(page: SplashPage, path: string, value: unknown): Promise<unknown> {
	return page.update({ [`system.${path}`]: value });
}

/**
 * Like setField but REPLACES the field wholesale (recursive:false) — for TypedSchemaFields
 *  (animations) where a deep merge would leak keys from the previous type.
 */
export function setFieldReplace(page: SplashPage, path: string, value: unknown): Promise<unknown> {
	return page.update({ [`system.${path}`]: value }, { recursive: false });
}

/** Replace a whole field within one sprite's placement in a state (e.g. a per-state animIn). */
export function replacePlacementField(page: SplashPage, children: SpriteCreate[], spriteId: string, stateKey: string, key: string, value: unknown): Promise<unknown> {
	return commitChildren(page, children, (next) => {
		const placement = next.find(c => c?.id === spriteId)?.states?.[stateKey] as Record<string, unknown> | undefined;
		if (placement) placement[key] = value;
	});
}

/**
 * Replace the whole `children` array. Foundry replaces arrays wholesale; `recursive: false`
 * also lets a sprite change TYPE (TypedSchemaField swap) and drops removed keys cleanly.
 */
export function setChildren(page: SplashPage, children: SpriteCreate[]): Promise<unknown> {
	return page.update({ 'system.children': children }, { recursive: false });
}

/**
 * Replace the whole `states` map. `recursive: false` replaces it outright (TypedObjectField
 * otherwise merges by key), so removed states disappear without explicit `-=` deletions.
 */
export function setStates(page: SplashPage, states: Record<string, StateDefinitionCreate>): Promise<unknown> {
	return page.update({ 'system.states': states }, { recursive: false });
}

/** Replace the whole `values` map (same wholesale-replace reasoning as states). */
export function setValues(page: SplashPage, values: Record<string, string>): Promise<unknown> {
	return page.update({ 'system.values': values }, { recursive: false });
}

/** Clone the children array, run a mutation against the clone, and commit it atomically. */
function commitChildren(page: SplashPage, children: SpriteCreate[], mutate: (next: SpriteCreate[]) => void): Promise<unknown> {
	const next = foundry.utils.deepClone(children) as SpriteCreate[];
	mutate(next);
	return setChildren(page, next);
}

/** Merge a patch into one sprite's top-level fields (name, type-specific content, etc.). */
export function updateSprite(page: SplashPage, children: SpriteCreate[], spriteId: string, patch: Record<string, unknown>): Promise<unknown> {
	return commitChildren(page, children, (next) => {
		const sprite = next.find(c => c?.id === spriteId);
		if (sprite) foundry.utils.mergeObject(sprite, patch);
	});
}

/** Replace a whole sub-object on a sprite (e.g. `onClick`, where merging would leak old-type keys). */
export function replaceSpriteField(page: SplashPage, children: SpriteCreate[], spriteId: string, key: string, value: unknown): Promise<unknown> {
	return commitChildren(page, children, (next) => {
		const sprite = next.find(c => c?.id === spriteId);
		if (sprite) (sprite as Record<string, unknown>)[key] = value;
	});
}

/** Merge a patch into one sprite's placement within a given state. */
export function updatePlacement(page: SplashPage, children: SpriteCreate[], spriteId: string, stateKey: string, patch: Record<string, unknown>): Promise<unknown> {
	return commitChildren(page, children, (next) => {
		const placement = next.find(c => c?.id === spriteId)?.states?.[stateKey];
		if (placement) foundry.utils.mergeObject(placement, patch);
	});
}

/** Append a new sprite. */
export function addSprite(page: SplashPage, children: SpriteCreate[], sprite: SpriteCreate): Promise<unknown> {
	return commitChildren(page, children, next => void next.push(sprite));
}

/** Remove a sprite entirely. */
export function removeSprite(page: SplashPage, children: SpriteCreate[], spriteId: string): Promise<unknown> {
	return setChildren(page, children.filter(c => c?.id !== spriteId));
}

/** Give a sprite a placement in a state (or remove it from that state when `placement` is null). */
export function setSpritePlacement(page: SplashPage, children: SpriteCreate[], spriteId: string, stateKey: string, placement: Record<string, unknown> | null): Promise<unknown> {
	return commitChildren(page, children, (next) => {
		const sprite = next.find(c => c?.id === spriteId);
		if (!sprite) return;
		sprite.states ??= {};
		if (placement === null) delete (sprite.states as Record<string, unknown>)[stateKey];
		else (sprite.states as Record<string, unknown>)[stateKey] = placement;
	});
}
