import type { EditorObject } from './editorModel.svelte.ts';
import { spriteDefaultSize } from '../../utils/spriteSize.ts';

/** Alignment edges available in the visual workspace. */
export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/** Placement bounds used consistently by canvas gestures and arrangement commands. */
export function objectBounds(object: EditorObject) {
	const placement = object.placement ?? {};
	const fallback = spriteDefaultSize(object.type);
	return {
		x: placement.x ?? 0,
		y: placement.y ?? 0,
		w: placement.width ?? fallback.width ?? 100,
		h: placement.height ?? fallback.height ?? 40,
	};
}

/** Align placed objects to their shared bounds, or to the stage for a single selection. */
export function alignedPlacements(objects: EditorObject[], alignment: Alignment, stage: { width: number; height: number }) {
	const placed = objects.filter(object => object.inState);
	if (!placed.length) return [];
	const bounds = placed.map(objectBounds);
	const left = placed.length === 1 ? 0 : Math.min(...bounds.map(rect => rect.x));
	const top = placed.length === 1 ? 0 : Math.min(...bounds.map(rect => rect.y));
	const right = placed.length === 1 ? stage.width : Math.max(...bounds.map(rect => rect.x + rect.w));
	const bottom = placed.length === 1 ? stage.height : Math.max(...bounds.map(rect => rect.y + rect.h));
	return placed.map((object, index) => {
		const rect = bounds[index];
		let patch: { x?: number; y?: number };
		switch (alignment) {
			case 'left':
				patch = { x: left };
				break;
			case 'center':
				patch = { x: Math.round((left + right - rect.w) / 2) };
				break;
			case 'right':
				patch = { x: right - rect.w };
				break;
			case 'top':
				patch = { y: top };
				break;
			case 'middle':
				patch = { y: Math.round((top + bottom - rect.h) / 2) };
				break;
			case 'bottom':
				patch = { y: bottom - rect.h };
				break;
		}
		return { id: object.id, patch };
	});
}
