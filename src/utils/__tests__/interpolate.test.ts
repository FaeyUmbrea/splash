import { describe, expect, it } from 'vitest';
import { interpolate } from '../interpolate.ts';

describe('interpolate', () => {
	it('replaces known tokens', () => {
		expect(interpolate('Hello {name}', { name: 'world' })).toBe('Hello world');
	});

	it('leaves unknown tokens intact', () => {
		expect(interpolate('Score: {missing}', {})).toBe('Score: {missing}');
	});

	it('supports namespaced keys such as vote tallies', () => {
		expect(interpolate('Castle: {vote:castle}', { 'vote:castle': '3' })).toBe('Castle: 3');
	});

	it('coerces values to strings', () => {
		expect(interpolate('Count: {n}', { n: 42 })).toBe('Count: 42');
	});

	it('replaces multiple tokens in one string', () => {
		expect(interpolate('{a} and {b}', { a: 'X', b: 'Y' })).toBe('X and Y');
	});
});
