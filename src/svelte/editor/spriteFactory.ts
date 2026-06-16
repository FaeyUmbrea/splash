import type { SpriteCreate } from '../../datamodel/SplashModel.ts';
import { nanoid } from 'nanoid';

export type SpriteType = 'image' | 'text' | 'button' | 'panel' | 'gauge' | 'hotspot' | 'video' | 'text-input' | 'draggable' | 'drop-zone';

function basePlacement(): Record<string, unknown> {
	return { x: 100, y: 100, zIndex: 0, priority: 0, name: '' };
}

/** A minimal valid sprite of the given type, placed in `stateKey`. */
export function createSprite(type: SpriteType, stateKey: string): SpriteCreate {
	const id = nanoid();
	const states = { [stateKey]: basePlacement() };

	if (type === 'image') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.imageName'), img: '', effects: [], states } as SpriteCreate;
	}
	if (type === 'text') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.textName'), text: game.i18n.localize('splash.editor.spriteFactory.textContent'), font: 'Arial', size: 34, fillColor: '#ffffff', align: 'center', effects: [], states } as SpriteCreate;
	}
	if (type === 'panel') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.panelName'), fill: '#222831', borderColor: '#000000', borderWidth: 0, radius: 0, effects: [], states } as SpriteCreate;
	}
	if (type === 'gauge') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.gaugeName'), valueKey: '', min: 0, max: 100, fillColor: '#4caf50', bgColor: '#222831', vertical: false, effects: [], states } as SpriteCreate;
	}
	if (type === 'hotspot') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.hotspotName'), onClick: { type: 'close' }, effects: [], states } as SpriteCreate;
	}
	if (type === 'video') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.videoName'), src: '', loop: true, muted: true, autoplay: true, effects: [], states } as SpriteCreate;
	}
	if (type === 'text-input') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.textInputName'), valueKey: '', placeholder: '', fontSize: 18, color: '#ffffff', bgColor: '#1b1b1e', effects: [], states } as SpriteCreate;
	}
	if (type === 'draggable') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.draggableName'), valueKey: '', tag: '', img: '', fill: '#37474f', radius: 8, effects: [], states } as SpriteCreate;
	}
	if (type === 'drop-zone') {
		return { type, id, name: game.i18n.localize('splash.editor.spriteFactory.dropZoneName'), accepts: '', onDrop: null, fill: '#22283155', borderColor: '#ffffff', borderWidth: 2, radius: 8, highlightColor: '#4caf50', effects: [], states } as SpriteCreate;
	}
	return {
		type: 'button',
		id,
		name: game.i18n.localize('splash.editor.spriteFactory.buttonName'),
		label: { text: game.i18n.localize('splash.editor.spriteFactory.buttonLabel'), fontSize: 20, strokeThickness: 0, stroke: '#000000', fill: '#ffffff' },
		image: { url: '', leftWidth: 0, topHeight: 0, rightWidth: 0, bottomHeight: 0 },
		onClick: { type: 'close' },
		effects: [],
		states,
	} as SpriteCreate;
}
