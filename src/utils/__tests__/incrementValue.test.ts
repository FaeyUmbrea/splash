import { expect, it } from 'vitest';
import { incrementValue } from '../incrementValue.ts';

it.each([
	{ value: '2', step: 1, min: null, max: null, wrap: false, expected: 3 },
	{ value: 4, step: 2, min: 0, max: 5, wrap: false, expected: 5 },
	{ value: 0, step: -1, min: 0, max: 5, wrap: false, expected: 0 },
	{ value: 5, step: 1, min: 0, max: 5, wrap: true, expected: 0 },
	{ value: 0, step: -1, min: 0, max: 5, wrap: true, expected: 5 },
	{ value: undefined, step: 1, min: null, max: null, wrap: false, expected: 1 },
])('applies the authored increment bounds: %j', ({ value, expected, ...action }) => {
	expect(incrementValue(value, action)).toBe(expected);
});
