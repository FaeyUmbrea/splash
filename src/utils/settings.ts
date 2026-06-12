import { ID } from './const.js';

export const SETTING_RENDERER = 'renderer';
export const SETTING_ACTIVE_SPLASH = 'activeSplash';

/** Splash-mode stacking: scene = above canvas only, hud = scene + hides scene chrome, full = above all UI. */
export type SplashLayer = 'scene' | 'hud' | 'full';

/** The world-global splash shown to everyone; null when none is up. */
export interface ActiveSplash {
	uuid: string;
	layer: SplashLayer;
}

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

	// Hidden lifecycle setting: GM-written; every client opens/closes in onChange,
	// and reloading clients restore from it so a splash survives world reboots.
	game.settings?.register(ID, SETTING_ACTIVE_SPLASH, {
		scope: 'world',
		config: false,
		type: Object,
		default: null,
		onChange: async (value) => {
			const { applyActiveSplash } = await import('../apps/controller.ts');
			await applyActiveSplash(value as ActiveSplash | null);
		},
	});
}

export function getActiveSplash(): ActiveSplash | null {
	return (game.settings?.get(ID, SETTING_ACTIVE_SPLASH) ?? null) as ActiveSplash | null;
}
