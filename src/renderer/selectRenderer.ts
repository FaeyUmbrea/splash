import { ID } from '../utils/const.js';
import { SETTING_RENDERER } from '../utils/settings.ts';

export type RendererKind = 'webgl' | 'html';

export function selectRenderer(): RendererKind {
	const choice = game.settings?.get(ID, SETTING_RENDERER);
	if (choice === 'webgl' || choice === 'html') return choice;
	const performanceMode = game.settings?.get('core', 'performanceMode')
		?? CONST.CANVAS_PERFORMANCE_MODES.HIGH;
	return performanceMode >= CONST.CANVAS_PERFORMANCE_MODES.HIGH ? 'webgl' : 'html';
}
