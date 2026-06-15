import GmLiveControls from '../svelte/GmLiveControls.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

const GM_CONTROLS_ID = 'splash-gm-controls';

/** Host has pointer-events: none; only the active-splash chip is interactive. */
export function registerGmControls(): void {
	Hooks.once('ready', () => {
		if (!game.user?.isGM) return;
		if (foundry.applications.instances.get(GM_CONTROLS_ID)) return;
		new SvelteRenderer(GmLiveControls, {}, { id: GM_CONTROLS_ID }).render(true);
	});
}
