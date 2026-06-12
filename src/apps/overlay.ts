import type { SplashPage } from '../utils/launch.ts';
import type { SplashLayer } from '../utils/settings.ts';
import SplashUI from '../svelte/SplashUI.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

const OVERLAY_ID = 'splash-application';

export interface SplashOptions {
	layer?: SplashLayer;
	skipAnimations?: boolean;
}

/** Body classes drive the layer CSS: raising the interface and hiding scene chrome. */
function applyLayerClasses(layer: SplashLayer | null): void {
	document.body.classList.toggle('splash-scene-covered', layer === 'scene' || layer === 'hud');
	document.body.classList.toggle('splash-hud-covered', layer === 'hud');
}

/** The fullscreen splash-mode application; cleans up its layer classes however it gets closed. */
class SplashOverlayApplication extends SvelteRenderer {
	protected override _onClose(options: foundry.applications.api.ApplicationV2.ClosingOptions): void {
		super._onClose(options);
		applyLayerClasses(null);
	}
}

/** Open the splash-mode overlay for a page, replacing any active one. */
export async function openSplashOverlay(page: SplashPage, { layer = 'full', skipAnimations = false }: SplashOptions = {}): Promise<void> {
	await closeSplashOverlay();
	applyLayerClasses(layer);
	new SplashOverlayApplication(
		SplashUI,
		{ splashConfig: page.system, skipAnimations },
		{ id: OVERLAY_ID, classes: ['splash-overlay', `splash-layer-${layer}`] },
	).render(true);
}

export async function closeSplashOverlay(): Promise<void> {
	await foundry.applications.instances.get(OVERLAY_ID)?.close();
}

export function getSplashOverlay(): foundry.applications.api.ApplicationV2.Any | undefined {
	return foundry.applications.instances.get(OVERLAY_ID);
}
