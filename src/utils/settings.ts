import { ID } from './const.js';

export const SETTING_RENDERER = 'renderer';
export const SETTING_ACTIVE_SPLASH = 'activeSplash';
export const SETTING_SHARED_STATE = 'sharedState';

/** Snapshot of a synced splash's runtime, persisted per page uuid. */
export interface SharedSplashState {
	loadedStates: string[];
	values: Record<string, string | number>;
}

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

	// Hidden shared-state store for synced splashes, keyed by page uuid. Only the
	// GM client writes it; everyone else mirrors. Entries persist so a communal
	// puzzle keeps its progress between opens and across reloads.
	game.settings?.register(ID, SETTING_SHARED_STATE, {
		scope: 'world',
		config: false,
		type: Object,
		default: {},
		onChange: async (value) => {
			const { onSharedStateChanged } = await import('./sync.ts');
			onSharedStateChanged((value ?? {}) as Record<string, SharedSplashState>);
		},
	});
}

export function getSharedStates(): Record<string, SharedSplashState> {
	return (game.settings?.get(ID, SETTING_SHARED_STATE) ?? {}) as Record<string, SharedSplashState>;
}

export function getActiveSplash(): ActiveSplash | null {
	return (game.settings?.get(ID, SETTING_ACTIVE_SPLASH) ?? null) as ActiveSplash | null;
}
