import type { SplashPage } from '../utils/launch.ts';
import type { ActiveSplash, SplashLayer } from '../utils/settings.ts';
import { ID } from '../utils/const.js';
import { isSplashPage } from '../utils/launch.ts';
import { getActiveSplash, SETTING_ACTIVE_SPLASH } from '../utils/settings.ts';
import { broadcastCloseSplash } from '../utils/socket.ts';
import { closeSplashOverlay, getSplashOverlay, openSplashOverlay } from './overlay.ts';

let peeking = false;

/** React to the activeSplash world setting: open, switch, or close the local overlay. */
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
	// Lets UI (e.g. the control surface) react to lifecycle changes.
	Hooks.callAll('splash.active-changed', value);
}

/** GM: show a splash to the whole table (persists across reloads until killed). */
export async function launchGlobalSplash(page: SplashPage, layer: SplashLayer): Promise<void> {
	await game.settings?.set(ID, SETTING_ACTIVE_SPLASH, { uuid: page.uuid, layer } satisfies ActiveSplash);
}

/** GM: close the global splash for everyone. */
export async function killGlobalSplash(): Promise<void> {
	await game.settings?.set(ID, SETTING_ACTIVE_SPLASH, null);
}

/** GM emergency stop: tear down every splash on every client (including rogue local ones), not just the global. */
export async function forceCloseAllSplashes(): Promise<void> {
	broadcastCloseSplash(undefined, true);
	Hooks.call('splash.close-splash', { skipOutro: true });
	await killGlobalSplash();
}

/** GM: locally hide/show the splash to work behind it; nobody else is affected. */
export function togglePeek(): boolean {
	const element = getSplashOverlay()?.element;
	if (!element) {
		peeking = false;
		return false;
	}
	peeking = !peeking;
	element.style.visibility = peeking ? 'hidden' : 'visible';
	// Peeking also needs the scene chrome back that hud mode hides.
	document.body.classList.toggle('splash-peeking', peeking);
	Hooks.callAll('splash.peek-changed', peeking);
	return peeking;
}

export function isPeeking(): boolean {
	return peeking;
}

/** Restore a persisted splash when the world loads, before entry animations could leak the canvas. */
export function registerControllerHooks(): void {
	Hooks.once('ready', () => {
		const active = getActiveSplash();
		if (active) applyActiveSplash(active, { restore: true });
	});
}
