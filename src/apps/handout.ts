import type { SplashPage } from '../utils/launch.ts';
import SplashUI from '../svelte/SplashUI.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

/** Handout-mode window: framed and player-closable, unlike the fullscreen splash overlay. */
class HandoutApplication extends SvelteRenderer {
	#title: string;

	constructor(page: SplashPage) {
		super(
			SplashUI,
			{ splashConfig: page.system },
			{
				id: `splash-handout-${page.id}`,
				classes: ['splash-handout'],
				window: {
					frame: true,
					positioned: true,
					resizable: true,
				},
				position: {
					width: 800,
					height: 600,
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
