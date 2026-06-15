import type { SplashPage } from '../utils/launch.ts';
import SplashUI from '../svelte/SplashUI.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

/** Handout-mode window: framed and player-closable, unlike the fullscreen splash overlay. */
class HandoutApplication extends SvelteRenderer {
	#title: string;

	constructor(page: SplashPage) {
		// Present at the splash's authored handout size; the runtime renderer draws sprites at raw
		// coordinates (no fit-scaling), so the window is NOT resizable — resizing would only clip.
		const size = (page.system as { handoutSize?: { width?: number; height?: number } | null }).handoutSize;
		super(
			SplashUI,
			{ splashConfig: page.system, pageUuid: page.uuid },
			{
				id: `splash-handout-${page.id}`,
				classes: ['splash-handout'],
				window: {
					frame: true,
					positioned: true,
					resizable: false,
				},
				position: {
					width: size?.width ?? 800,
					height: size?.height ?? 600,
				},
			},
		);
		this.#title = page.name ?? '';
	}

	override get title(): string {
		return this.#title;
	}
}

/** Open a page as a handout window; reuses the existing window when already open. */
export async function openHandout(page: SplashPage): Promise<void> {
	const existing = foundry.applications.instances.get(`splash-handout-${page.id}`);
	if (existing) {
		existing.bringToFront();
		return;
	}
	new HandoutApplication(page).render(true);
}
