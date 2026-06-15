import type { SplashPage } from '../utils/launch.ts';
import type { ActiveSplash, SplashLayer } from '../utils/settings.ts';
import { ID } from '../utils/const.js';
import { isSplashPage } from '../utils/launch.ts';
import { getActiveSplash, SETTING_ACTIVE_SPLASH } from '../utils/settings.ts';
import { broadcastCloseSplash } from '../utils/socket.ts';
import { closeSplashOverlay, getSplashOverlay, openSplashOverlay } from './overlay.ts';

let peeking = false;

export async function applyActiveSplash(value: ActiveSplash | null, { restore = false }: { restore?: boolean } = {}): Promise<void> {
	peeking = false;
	document.body.classList.remove('splash-peeking');
	Hooks.callAll('splash.peek-changed', false);
	if (value) {
		const page = await fromUuid(value.uuid);
		if (!isSplashPage(page)) return;
		await openSplashOverlay(page, { layer: value.layer, skipAnimations: restore });
	} else {
		await closeSplashOverlay();
	}
	Hooks.callAll('splash.active-changed', value);
}

/** Persists across reloads until killed. */
export async function launchGlobalSplash(page: SplashPage, layer: SplashLayer): Promise<void> {
	await game.settings?.set(ID, SETTING_ACTIVE_SPLASH, { uuid: page.uuid, layer } satisfies ActiveSplash);
}

export async function killGlobalSplash(): Promise<void> {
	await game.settings?.set(ID, SETTING_ACTIVE_SPLASH, null);
}

/** Tears down every splash on every client, including local ones, not just the global. */
export async function forceCloseAllSplashes(): Promise<void> {
	broadcastCloseSplash(undefined, true);
	Hooks.call('splash.close-splash', { skipOutro: true });
	await killGlobalSplash();
}

/** Hides/shows the splash on this client only. */
export function togglePeek(): boolean {
	const element = getSplashOverlay()?.element;
	if (!element) {
		peeking = false;
		return false;
	}
	peeking = !peeking;
	element.style.visibility = peeking ? 'hidden' : 'visible';
	// Restores the scene chrome that hud mode hides.
	document.body.classList.toggle('splash-peeking', peeking);
	Hooks.callAll('splash.peek-changed', peeking);
	return peeking;
}

export function isPeeking(): boolean {
	return peeking;
}

/** Restores a persisted splash on load with animations skipped, so the canvas never shows through. */
export function registerControllerHooks(): void {
	Hooks.once('ready', () => {
		const active = getActiveSplash();
		if (active) applyActiveSplash(active, { restore: true });
	});
}
