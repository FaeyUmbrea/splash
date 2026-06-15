import type { PresetPayload } from '../presets.ts';
import { beforeAll, describe, expect, it } from 'vitest';

// Stub foundry.utils.deepClone for the Node test env.
beforeAll(() => {
	(globalThis as Record<string, unknown>).foundry ??= {
		utils: { deepClone: (v: unknown) => structuredClone(v) },
	};
});

const {
	buttonSpriteToPreset,
	materializeSprite,
	normalizePresetPayload,
	normalizeSpriteForPreset,
	presetThumb,
	sanitizeAction,
} = await import('../presets.ts');

function button(): Record<string, unknown> {
	return {
		type: 'button',
		id: 'orig-id',
		name: 'Door',
		x: 100,
		y: 200,
		states: { initial: { x: 5, y: 5 } },
		effects: [],
		animIn: { type: 'dissolve' },
		label: { text: 'Open', fontSize: 20, strokeThickness: 0, stroke: '#000', fill: '#fff' },
		image: { url: 'door.png', leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 },
		clickImage: null,
		hoverImage: { url: 'hover.png', leftWidth: 8, topHeight: 8, rightWidth: 8, bottomHeight: 8 },
		tint: '#abcdef',
		hoverTint: '',
		clickTint: '',
		onClick: { type: 'macro', macro: 'Macro.xyz' },
	};
}

describe('preset pure transforms', () => {
	it('sanitizeAction always returns a bare close', () => {
		expect(sanitizeAction()).toEqual({ type: 'close' });
	});

	it('buttonSpriteToPreset keeps style, drops base/placement, strips the action', () => {
		const preset = buttonSpriteToPreset(button() as never) as Record<string, unknown>;
		expect(preset.type).toBe('button');
		expect((preset.label as { text: string }).text).toBe('Open');
		expect((preset.image as { url: string }).url).toBe('door.png');
		expect((preset.hoverImage as { url: string }).url).toBe('hover.png');
		expect(preset.clickImage).toBeNull();
		expect(preset.tint).toBe('#abcdef');
		expect(preset.onClick).toEqual({ type: 'close' });
		expect(preset.id).toBeUndefined();
		expect(preset.states).toBeUndefined();
		expect(preset.x).toBeUndefined();
		expect(preset.animIn).toBeUndefined();
	});

	it('normalizeSpriteForPreset regenerates id, clears placement, sanitizes action', () => {
		const out = normalizeSpriteForPreset(button() as never) as Record<string, unknown>;
		expect(out.id).not.toBe('orig-id');
		expect(out.id).toBeTruthy();
		expect(out.states).toEqual({});
		expect(out.effects).toEqual([]);
		expect(out.onClick).toEqual({ type: 'close' });
	});

	it('normalizeSpriteForPreset guarantees an effects array when missing', () => {
		const sprite = { type: 'text', name: 'T', text: 'hi', states: {} } as Record<string, unknown>;
		const out = normalizeSpriteForPreset(sprite as never) as Record<string, unknown>;
		expect(out.effects).toEqual([]);
	});

	it('materializeSprite places into the active state and re-sanitizes the action', () => {
		const out = materializeSprite(button() as never, 'state2', { x: 42, y: 7 }) as Record<string, unknown>;
		expect(out.id).not.toBe('orig-id');
		expect(out.states).toEqual({ state2: { x: 42, y: 7, zIndex: 0, priority: 0, name: '' } });
		expect(out.effects).toEqual([]);
		expect(out.onClick).toEqual({ type: 'close' });
	});

	it('materializeSprite defaults placement when no position is given', () => {
		const out = materializeSprite({ type: 'image', name: 'I', img: 'x.png', states: {}, effects: [] } as never, 's') as Record<string, unknown>;
		expect((out.states as Record<string, { x: number; y: number }>).s).toMatchObject({ x: 100, y: 100 });
	});

	it('presetThumb resolves a sensible thumbnail per kind', () => {
		expect(presetThumb({ type: 'nineslice', url: 'n.png', leftWidth: 1, topHeight: 1, rightWidth: 1, bottomHeight: 1 } as PresetPayload)).toBe('n.png');
		expect(presetThumb({ type: 'button', image: { url: 'b.png' } } as unknown as PresetPayload)).toBe('b.png');
		expect(presetThumb({ type: 'sprite', value: { type: 'image', img: 'sp.png' } } as unknown as PresetPayload)).toBe('sp.png');
		expect(presetThumb({ type: 'spriteGroup', value: [{ type: 'text' }, { type: 'button', image: { url: 'g.png' } }] } as unknown as PresetPayload)).toBe('g.png');
		expect(presetThumb({ type: 'spriteGroup', value: [{ type: 'text' }] } as unknown as PresetPayload)).toContain('icons/svg/');
		expect(presetThumb({ type: 'animation', value: { type: 'glitch' } } as unknown as PresetPayload)).toContain('icons/svg/');
	});

	it('normalizePresetPayload strips a single sprite to style but keeps a group prefab\'s layout', () => {
		const sprite = normalizePresetPayload({ type: 'sprite', value: { type: 'image', id: 'a', img: 'x.png', states: { initial: {} } } as never });
		expect((sprite as { value: Record<string, unknown> }).value.states).toEqual({});
		expect((sprite as { value: Record<string, unknown> }).value.id).not.toBe('a');

		const group = normalizePresetPayload({ type: 'spriteGroup', value: [{ type: 'image', id: 'a', img: 'x.png', states: { initial: { x: 5 } } } as never] });
		expect((group as { value: Record<string, unknown>[] }).value[0].states).toEqual({ initial: { x: 5 } });

		const anim = { type: 'animation', value: { type: 'dissolve', duration: 1, delay: 0, props: {} } } as unknown as PresetPayload;
		expect(normalizePresetPayload(anim)).toBe(anim);
	});
});
