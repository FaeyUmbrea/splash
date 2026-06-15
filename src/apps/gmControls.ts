import GmLiveControls from '../svelte/GmLiveControls.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

const GM_CONTROLS_ID = 'splash-gm-controls';

/**
 * Mount the GM live-control surface once. It's a frameless, click-through host (pointer-events: none)
 * that renders nothing until a splash is active; the chip itself is the only interactive part. Sits
 * above the fullscreen overlay so the GM can always minimize or force-close a live splash.
 */
export function registerGmControls(): void {
	Hooks.once('ready', () => {
		if (!game.user?.isGM) return;
		if (foundry.applications.instances.get(GM_CONTROLS_ID)) return;
		new SvelteRenderer(GmLiveControls, {}, { id: GM_CONTROLS_ID }).render(true);
	});
}
