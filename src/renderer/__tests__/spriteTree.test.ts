import type { SpriteInitialized } from '../../datamodel/SplashModel.ts';
import { describe, expect, it } from 'vitest';
import { buildSpriteTree } from '../spriteTree.ts';

function sprite(partial: Partial<SpriteInitialized> & { id: string; name: string }): SpriteInitialized {
	return { type: 'text', ...partial } as SpriteInitialized;
}

describe('buildSpriteTree', () => {
	it('puts ungrouped sprites directly under root', () => {
		const { root } = buildSpriteTree([
			sprite({ id: 'a', name: 'A' }),
			sprite({ id: 'b', name: 'B' }),
		]);
		expect(root.children.map(c => c.name)).toEqual(['A', 'B']);
		expect(root.children.every(c => c.parent === root)).toBe(true);
	});

	it('groups sprites with the same groupId under one synthetic group node', () => {
		const { root } = buildSpriteTree([
			sprite({ id: 't', name: 'Top', groupId: 'wheel-1' }),
			sprite({ id: 'm', name: 'Middle', groupId: 'wheel-1' }),
			sprite({ id: 'b', name: 'Bottom', groupId: 'wheel-1' }),
		]);
		expect(root.children).toHaveLength(1);
		const group = root.children[0];
		expect(group.type).toBe('group');
		expect(group.name).toBe('wheel-1');
		expect(group.children.map(c => c.name)).toEqual(['Top', 'Middle', 'Bottom']);
	});

	it('supports scope.parent.child.get("Top") from a member', () => {
		const { byId } = buildSpriteTree([
			sprite({ id: 'up', name: 'Up', type: 'button', groupId: 'wheel-1' }),
			sprite({ id: 't', name: 'Top', groupId: 'wheel-1' }),
			sprite({ id: 'm', name: 'Middle', groupId: 'wheel-1' }),
		]);
		const scope = byId.get('up')!;
		expect(scope.parent?.type).toBe('group');
		expect(scope.parent?.child.get('Top')?.id).toBe('t');
		expect(scope.parent?.child.get('Middle')?.id).toBe('m');
		expect(scope.parent?.child.get('Nope')).toBeUndefined();
	});

	it('keeps separate groups separate, and a button only sees its own wheel', () => {
		const { byId } = buildSpriteTree([
			sprite({ id: 'u1', name: 'Up', type: 'button', groupId: 'wheel-1' }),
			sprite({ id: 'm1', name: 'Middle', groupId: 'wheel-1' }),
			sprite({ id: 'u2', name: 'Up', type: 'button', groupId: 'wheel-2' }),
			sprite({ id: 'm2', name: 'Middle', groupId: 'wheel-2' }),
		]);
		// the wheel-1 button resolves wheel-1's Middle, not wheel-2's
		expect(byId.get('u1')!.parent!.child.get('Middle')!.id).toBe('m1');
		expect(byId.get('u2')!.parent!.child.get('Middle')!.id).toBe('m2');
	});

	it('exposes each sprite\'s context on its node', () => {
		const { byId } = buildSpriteTree([
			sprite({ id: 'up', name: 'Up', type: 'button', groupId: 'wheel-1', context: { Keyword: 'OPEN', Position: 0 } } as never),
		]);
		expect(byId.get('up')!.context).toEqual({ Keyword: 'OPEN', Position: 0 });
	});

	it('indexes every sprite by id for O(1) scope lookup', () => {
		const { byId } = buildSpriteTree([
			sprite({ id: 'a', name: 'A' }),
			sprite({ id: 'b', name: 'B', groupId: 'g' }),
		]);
		expect(byId.get('a')?.name).toBe('A');
		expect(byId.get('b')?.name).toBe('B');
		expect(byId.size).toBe(2);
	});
});
