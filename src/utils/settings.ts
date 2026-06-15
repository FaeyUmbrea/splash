import SplashManager from '../apps/SplashManager.ts';
import { ID } from './const.js';

export const SETTING_RENDERER = 'renderer';
export const SETTING_ACTIVE_SPLASH = 'activeSplash';
export const SETTING_DATA_MODEL_VERSION = 'dataModelVersion';

/** The current data-model version. Bump only when shipping a real post-release migration. */
export const CURRENT_DATA_MODEL_VERSION = 1;

/** Splash-mode stacking: scene = above canvas only, hud = scene + hides scene chrome, full = above all UI. */
export type SplashLayer = 'scene' | 'hud' | 'full';

/** The world-global splash shown to everyone; null when none is up. */
export interface ActiveSplash {
	uuid: string;
	layer: SplashLayer;
}

export function registerSettings(): void {
	// The Splash Manager is opened from a settings menu button (GM only).
	game.settings?.registerMenu(ID, 'manager', {
		name: 'splash.manager.menuName',
		label: 'splash.manager.menuLabel',
		hint: 'splash.manager.menuHint',
		icon: 'fas fa-images',
		type: SplashManager as unknown as typeof foundry.applications.api.ApplicationV2,
		restricted: true,
	});

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

	// Synced-splash runtime state lives per-page in `flags.splash.runtime` (see utils/sync.ts), not here, so
	// it stays scoped per splash and never balloons with the number of locks.

	// Data-model version. -1 means "never stamped"; the baseline stamp lifts it to current so future releases
	// can distinguish a fresh install from one that must migrate forward.
	game.settings?.register(ID, SETTING_DATA_MODEL_VERSION, {
		scope: 'world',
		config: false,
		type: Number,
		default: -1,
	});
}

export function getDataModelVersion(): number {
	return (game.settings?.get(ID, SETTING_DATA_MODEL_VERSION) ?? -1) as number;
}

export async function setDataModelVersion(version: number): Promise<void> {
	await game.settings?.set(ID, SETTING_DATA_MODEL_VERSION, version);
}

export function getActiveSplash(): ActiveSplash | null {
	return (game.settings?.get(ID, SETTING_ACTIVE_SPLASH) ?? null) as ActiveSplash | null;
}
