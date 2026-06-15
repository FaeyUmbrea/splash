import { describe, expect, it } from 'vitest';
import { tumblerLock } from '../tumblerLock.ts';

function build(codeword: string) {
	return tumblerLock.build({ codeword }, { stateKey: 'initial' }) as Array<Record<string, any>>;
}

describe('tumblerLock.build', () => {
	it('generates one wheel per letter (6 sprites each) plus an unlock button', () => {
		const sprites = build('OPEN'); // 4 letters
		expect(sprites).toHaveLength(4 * 6 + 1);
		expect(sprites.filter(s => s.name === 'Unlock')).toHaveLength(1);
	});

	it('groups each wheel under its own groupId and leaves the unlock button ungrouped', () => {
		const sprites = build('AB');
		const groups = new Set(sprites.filter(s => s.groupId).map(s => s.groupId));
		expect(groups.size).toBe(2); // two wheels
		const unlock = sprites.find(s => s.name === 'Unlock')!;
		expect(unlock.groupId).toBeNull();
	});

	it('names the parts so the macros can address them', () => {
		const sprites = build('AB');
		const wheel0 = sprites[0].groupId;
		const members = sprites.filter(s => s.groupId === wheel0).map(s => s.name).sort();
		expect(members).toEqual(['Body', 'Bottom', 'Down', 'Middle', 'Top', 'Up']);
	});

	it('wires the rotate macro + direction context on the arrows', () => {
		const sprites = build('A');
		const up = sprites.find(s => s.name === 'Up')!;
		const down = sprites.find(s => s.name === 'Down')!;
		expect(up.onClick.type).toBe('script');
		expect(up.context).toEqual({ Direction: 1 });
		expect(down.context).toEqual({ Direction: -1 });
		expect(up.onClick.source).toContain('child.get(\'Middle\')');
	});

	it('gives the unlock button the keyword and the ordered wheel ids', () => {
		const sprites = build('OPEN');
		const unlock = sprites.find(s => s.name === 'Unlock')!;
		expect(unlock.context.Keyword).toBe('OPEN');
		expect(unlock.context.Wheels).toHaveLength(4);
		// the wheel ids in context match the actual wheel groups, in order
		const wheelGroupsInOrder = sprites.filter(s => s.name === 'Body').map(s => s.groupId);
		expect(unlock.context.Wheels).toEqual(wheelGroupsInOrder);
	});

	it('uppercases and strips non-letters, defaulting to OPEN when empty', () => {
		expect(build('o p3n!')[0]).toBeTruthy();
		const wheels = (w: string) => build(w).filter(s => s.name === 'Body').length;
		expect(wheels('cat')).toBe(3);
		expect(wheels('a1b2c3')).toBe(3); // digits stripped
		expect(wheels('')).toBe(4); // default OPEN
	});

	it('places every sprite in the target state', () => {
		const sprites = build('A');
		expect(sprites.every(s => s.states.initial)).toBe(true);
	});
});
