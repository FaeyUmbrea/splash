import type { SplashPage } from '../utils/launch.ts';
import SplashUI from '../svelte/SplashUI.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

const OVERLAY_ID = 'splash-application';

/** Open the fullscreen splash overlay for a page, replacing any active splash. */
export async function openSplashOverlay(page: SplashPage, popover: boolean = false): Promise<void> {
	await closeSplashOverlay();
	new SvelteRenderer(
		SplashUI,
		{ splashConfig: page.system, popover },
		{ id: OVERLAY_ID, classes: ['splash-overlay'] },
	).render(true);
}

export async function closeSplashOverlay(): Promise<void> {
	await foundry.applications.instances.get(OVERLAY_ID)?.close();
}
