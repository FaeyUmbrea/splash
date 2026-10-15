import type { RuntimeSnapshot } from '../../renderer/SplashRuntime.ts';
import { isDeepStrictEqual } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyRuntimeChanges, combineRuntimeChanges, hasRuntimeChanges, isRuntimeChanges, runtimeChanges } from '../runtimeChanges.ts';

/** Empty playback snapshot for exercising field operations independently of Foundry documents. */
function snapshot(values: Record<string, unknown> = {}): RuntimeSnapshot {
	return { loadedStates: ['initial'], values, overrides: {} };
}

beforeEach(() => vi.stubGlobal('foundry', { utils: { equals: isDeepStrictEqual } }));
afterEach(() => vi.unstubAllGlobals());

describe('runtime changes', () => {
	it('preserves unrelated values while applying explicit removals from a reset', () => {
		const changes = runtimeChanges(snapshot({ answer: 'old' }), snapshot());
		expect(applyRuntimeChanges(snapshot({ answer: 'old', otherPlayer: 'new' }), changes).values).toEqual({ otherPlayer: 'new' });
	});

	it('removes one sprite override without erasing another player’s new property', () => {
		const before = { ...snapshot(), overrides: { dial: { text: 'A' } } };
		const current = { ...snapshot(), overrides: { dial: { text: 'A', color: 'red' }, other: { text: 'B' } } };
		expect(applyRuntimeChanges(current, runtimeChanges(before, snapshot())).overrides).toEqual({ dial: { color: 'red' }, other: { text: 'B' } });
	});

	it('adds and removes authored states without replacing unrelated loaded states', () => {
		const changes = runtimeChanges(snapshot(), { ...snapshot(), loadedStates: ['revealed'] });
		expect(applyRuntimeChanges({ ...snapshot(), loadedStates: ['initial', 'other'] }, changes).loadedStates).toEqual(['other', 'revealed']);
	});

	it('coalesces repeated edits while keeping independent edits and explicit null values', () => {
		const first = runtimeChanges(snapshot(), snapshot({ answer: 'first', keep: null }));
		const next = runtimeChanges(snapshot({ answer: 'first' }), snapshot({ answer: 'latest' }));
		expect(applyRuntimeChanges(snapshot(), combineRuntimeChanges(first, next)).values).toEqual({ answer: 'latest', keep: null });
	});

	it('does not send unchanged nested values', () => {
		expect(hasRuntimeChanges(runtimeChanges(snapshot({ nested: { a: [1, 2] } }), snapshot({ nested: { a: [1, 2] } })))).toBe(false);
	});

	it('preserves a data key named __proto__ without invoking an object setter', () => {
		const values = Object.fromEntries([['__proto__', 'answer']]);
		const result = applyRuntimeChanges(snapshot(), runtimeChanges(snapshot(), snapshot(values)));
		expect(Object.getPrototypeOf(result.values)).toBe(Object.prototype);
		expect(Object.hasOwn(result.values, '__proto__')).toBe(true);
		expect(Object.getOwnPropertyDescriptor(result.values, '__proto__')?.value).toBe('answer');
	});

	it.each([
		null,
		{ states: [], values: [], overrides: {} },
		{ states: { initial: 'yes' }, values: [], overrides: {} },
		{ states: {}, values: [{ key: 'answer' }], overrides: {} },
		{ states: {}, values: [], overrides: { dial: null } },
		{ states: new Date(), values: [], overrides: {} },
	])('rejects malformed transport data: %j', (value) => {
		expect(isRuntimeChanges(value)).toBe(false);
	});

	it('accepts set and removal operations generated from a snapshot', () => {
		expect(isRuntimeChanges(runtimeChanges(snapshot({ old: 'value' }), snapshot({ next: null })))).toBe(true);
	});
});
