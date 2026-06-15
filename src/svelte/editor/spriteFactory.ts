import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
import { nanoid } from 'nanoid';

export type SpriteType = 'image' | 'text' | 'button' | 'panel';

function basePlacement(): Record<string, unknown> {
	return { x: 100, y: 100, zIndex: 0, priority: 0, name: '' };
}

/** A minimal valid sprite of the given type, placed in `stateKey`. Content is edited afterwards. */
export function createSprite(type: SpriteType, stateKey: string): SpriteCreate {
	const id = nanoid();
	const states = { [stateKey]: basePlacement() };

	if (type === 'image') {
		return { type, id, name: 'Image', img: '', effects: [], states } as SpriteCreate;
	}
	if (type === 'text') {
		return { type, id, name: 'Text', text: 'Text', font: 'Arial', size: 34, fillColor: '#ffffff', align: 'center', effects: [], states } as SpriteCreate;
	}
	if (type === 'panel') {
		return { type, id, name: 'Panel', fill: '#222831', borderColor: '#000000', borderWidth: 0, radius: 0, effects: [], states } as SpriteCreate;
	}
	return {
		type: 'button',
		id,
		name: 'Button',
		label: { text: 'Button', fontSize: 20, strokeThickness: 0, stroke: '#000000', fill: '#ffffff' },
		image: { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 },
		onClick: { type: 'close' },
		effects: [],
		states,
	} as SpriteCreate;
}
