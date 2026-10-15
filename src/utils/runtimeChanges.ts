import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';

/** One named value or sprite-property edit; removal is distinct from setting null. */
export type ValueChange = { key: string; value: unknown } | { key: string; remove: true };

/** Changes made by one runtime since its previous local or shared observation. */
export interface RuntimeChanges {
	states: Record<string, boolean>;
	values: ValueChange[];
	overrides: Record<string, ValueChange[]>;
}

/** Compare record fields through Foundry's deep equality without requiring the values themselves to be objects. */
function valueChanges(before: Record<string, unknown>, after: Record<string, unknown>): ValueChange[] {
	const changes: ValueChange[] = [];
	const equal = foundry.utils.equals ?? foundry.utils.objectsEqual;
	for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
		if (!Object.hasOwn(after, key)) changes.push({ key, remove: true });
		else if (!Object.hasOwn(before, key) || !equal({ value: before[key] }, { value: after[key] })) changes.push({ key, value: after[key] });
	}
	return changes;
}

/** Derive only edits made between two observations, leaving unrelated shared fields out of the request. */
export function runtimeChanges(before: RuntimeSnapshot, after: RuntimeSnapshot): RuntimeChanges {
	const states = Object.fromEntries([...new Set([...before.loadedStates, ...after.loadedStates])]
		.filter(state => before.loadedStates.includes(state) !== after.loadedStates.includes(state))
		.map(state => [state, after.loadedStates.includes(state)]));
	const overrides: RuntimeChanges['overrides'] = {};
	for (const id of new Set([...Object.keys(before.overrides), ...Object.keys(after.overrides)])) {
		const changes = valueChanges(before.overrides[id] ?? {}, after.overrides[id] ?? {});
		if (changes.length) Object.defineProperty(overrides, id, { value: changes, enumerable: true });
	}
	return { states, values: valueChanges(before.values, after.values), overrides };
}

/** Keep the last pending edit to each key while retaining edits to other keys. */
function combineValues(first: ValueChange[], next: ValueChange[]): ValueChange[] {
	return [...new Map([...first, ...next].map(change => [change.key, change])).values()];
}

/** Coalesce rapid local edits without adding fields learned from another client's shared update. */
export function combineRuntimeChanges(first: RuntimeChanges | undefined, next: RuntimeChanges): RuntimeChanges {
	if (!first) return next;
	const ids = new Set([...Object.keys(first.overrides), ...Object.keys(next.overrides)]);
	return {
		states: { ...first.states, ...next.states },
		values: combineValues(first.values, next.values),
		overrides: Object.fromEntries([...ids].map(id => [id, combineValues(first.overrides[id] ?? [], next.overrides[id] ?? [])])),
	};
}

/** Apply field operations without mutating the source record or treating a key as an object setter. */
function applyValues(current: Record<string, unknown>, changes: ValueChange[]): Record<string, unknown> {
	const values = new Map(Object.entries(current));
	for (const change of changes) {
		if ('remove' in change) values.delete(change.key);
		else values.set(change.key, change.value);
	}
	return Object.fromEntries(values);
}

/** Apply one client's edits to the latest authoritative snapshot, including explicit removals. */
export function applyRuntimeChanges(current: RuntimeSnapshot, changes: RuntimeChanges): RuntimeSnapshot {
	const states = new Set(current.loadedStates);
	for (const [state, loaded] of Object.entries(changes.states)) {
		if (loaded) states.add(state);
		else states.delete(state);
	}
	const overrides = new Map(Object.entries(current.overrides));
	for (const [id, edits] of Object.entries(changes.overrides)) {
		const values = applyValues(overrides.get(id) ?? {}, edits);
		if (Object.keys(values).length) overrides.set(id, values);
		else overrides.delete(id);
	}
	return { loadedStates: [...states], values: applyValues(current.values, changes.values), overrides: Object.fromEntries(overrides) };
}

/** Avoid sending or saving an observation which contains no local edits. */
export function hasRuntimeChanges(changes: RuntimeChanges): boolean {
	return !!(Object.keys(changes.states).length || changes.values.length || Object.keys(changes.overrides).length);
}

/** Accept field-operation arrays before any socket payload is applied to shared state. */
function isValueChanges(value: unknown): value is ValueChange[] {
	return Array.isArray(value) && value.every(change => isRecord(change)
		&& typeof change.key === 'string' && (change.remove === true || (!Object.hasOwn(change, 'remove') && Object.hasOwn(change, 'value'))));
}

/** Runtime transport containers must be plain records, rather than arrays or class instances. */
function isRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/** Validate only the transport containers; authored state and sprite IDs are pruned by the sync receiver. */
export function isRuntimeChanges(value: unknown): value is RuntimeChanges {
	if (!isRecord(value) || !isRecord(value.states) || !isRecord(value.overrides)) return false;
	return Object.values(value.states).every(loaded => typeof loaded === 'boolean')
		&& isValueChanges(value.values) && Object.values(value.overrides).every(isValueChanges);
}
