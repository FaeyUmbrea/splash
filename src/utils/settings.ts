import { ID } from './const.js';

export const SETTING_RENDERER = 'renderer';

export function registerSettings(): void {
	game.settings?.register(ID, SETTING_RENDERER, {
		name: 'splash.settings.renderer.name',
		hint: 'splash.settings.renderer.hint',
		scope: 'client',
		config: true,
		type: String,
		choices: {
			auto: 'splash.settings.renderer.auto',
			webgl: 'splash.settings.renderer.webgl',
			html: 'splash.settings.renderer.html',
		},
		default: 'auto',
	});
}
