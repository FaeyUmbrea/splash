import type { EditorObject } from '../editorModel.svelte.ts';
import { describe, expect, it } from 'vitest';
import { alignedPlacements, objectBounds } from '../selectionGeometry.ts';

/** Make a placed panel for arrangement tests without depending on Foundry documents. */
function object(id: string, x: number, y: number, width = 100, height = 50): EditorObject {
	return { id, type: 'panel', name: id, raw: {} as EditorObject['raw'], inState: true, placement: { x, y, width, height } };
}

const stage = { width: 800, height: 600 };

describe('selection alignment', () => {
	it('aligns one object to the stage and multiple objects to their shared bounds', () => {
		const first = object('first', 20, 40);
		const second = object('second', 200, 180, 60, 100);
		expect(alignedPlacements([first], 'center', stage)).toEqual([{ id: 'first', patch: { x: 350 } }]);
		expect(alignedPlacements([first, second], 'center', stage)).toEqual([
			{ id: 'first', patch: { x: 90 } },
			{ id: 'second', patch: { x: 110 } },
		]);
		expect(alignedPlacements([first, second], 'bottom', stage)).toEqual([
			{ id: 'first', patch: { y: 230 } },
			{ id: 'second', patch: { y: 180 } },
		]);
	});

	it.each([
		['left', { x: 0 }],
		['right', { x: 700 }],
		['top', { y: 0 }],
		['middle', { y: 275 }],
		['bottom', { y: 550 }],
	] as const)('aligns a single object to %s without changing its other coordinate', (alignment, patch) => {
		expect(alignedPlacements([object('first', 20, 40)], alignment, stage)).toEqual([{ id: 'first', patch }]);
	});

	it('excludes objects absent from the current state without mutating the selection', () => {
		const first = object('first', 20, 40);
		const absent = { ...object('absent', -1000, -1000), inState: false, placement: undefined };
		expect(alignedPlacements([absent], 'left', stage)).toEqual([]);
		expect(alignedPlacements([first, absent], 'right', stage)).toEqual([{ id: 'first', patch: { x: 700 } }]);
		expect(first.placement).toEqual({ x: 20, y: 40, width: 100, height: 50 });
	});

	it('uses the same default dimensions as canvas gestures when size is unset', () => {
		const panel = object('panel', 10, 20);
		panel.placement = { x: 10, y: 20 };
		expect(objectBounds(panel)).toEqual({ x: 10, y: 20, w: 200, h: 200 });
		expect(alignedPlacements([panel], 'right', stage)).toEqual([{ id: 'panel', patch: { x: 600 } }]);
	});
});
