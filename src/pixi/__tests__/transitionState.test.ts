import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../gaugeGraphics.js', () => ({ default: class {} }));
vi.mock('../nineSlicePlaneButton.js', () => ({ default: class {} }));
vi.mock('../panelGraphics.js', () => ({ default: class {} }));

/** PIXI point contract used by placement, without allocating a canvas. */
class Point {
	x = 0;
	y = 0;
	/** Assign coordinates with PIXI's default point values. */
	set(x = 0, y = x): void {
		this.x = x;
		this.y = y;
	}
}

/** Text geometry whose glyph width can change independently of its placement. */
class Text {
	position = new Point();
	anchor = new Point();
	skew = new Point();
	width = 32;
	height = 56;
	zIndex = 0;
	constructor(readonly style: { align: string }) {}
}

let transitionState: typeof import('../transitionState.ts')['transitionState'];

beforeAll(async () => {
	vi.stubGlobal('PIXI', { Text, Container: class {} });
	transitionState = (await import('../transitionState.ts')).transitionState;
});
afterAll(() => vi.unstubAllGlobals());

describe('text placement', () => {
	it.each([
		['left', 200, 232],
		['center', 229, 261],
		['right', 258, 290],
	])('places %s-aligned glyphs inside the authored width without stretching', (align, left, right) => {
		const text = new Text({ align });
		transitionState(text as unknown as PIXI.Text, { x: 200, y: 100, width: 90, height: 80 });
		expect(text.position.x - text.anchor.x * text.width).toBe(left);
		expect(text.position.x + (1 - text.anchor.x) * text.width).toBe(right);
		expect(text.position.y).toBe(100);
		expect([text.width, text.height]).toEqual([32, 56]);
	});

	it('keeps changing text centred on the same authored box', () => {
		const text = new Text({ align: 'center' });
		transitionState(text as unknown as PIXI.Text, { x: 200, width: 90 });
		text.width = 68;
		expect(text.position.x - text.anchor.x * text.width + text.width / 2).toBe(245);
	});

	it('returns to natural left positioning when a state removes the width', () => {
		const text = new Text({ align: 'right' });
		transitionState(text as unknown as PIXI.Text, { x: 200, width: 90 });
		transitionState(text as unknown as PIXI.Text, { x: 50 });
		text.width = 68;
		expect(text.position.x - text.anchor.x * text.width).toBe(50);
	});
});
