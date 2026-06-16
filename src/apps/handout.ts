import type { SplashPage } from '../utils/launch.ts';
import SplashUI from '../svelte/SplashUI.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

class HandoutApplication extends SvelteRenderer {
	#title: string;

	constructor(page: SplashPage, spectate = false) {
		// Not resizable: the runtime renderer draws sprites at raw coordinates, so resizing only clips.
		const size = (page.system as { handoutSize?: { width?: number; height?: number } | null }).handoutSize;
		super(
			SplashUI,
			{ splashConfig: page.system, pageUuid: page.uuid, spectate },
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

export async function openHandout(page: SplashPage, spectate = false): Promise<void> {
	const existing = foundry.applications.instances.get(`splash-handout-${page.id}`);
	if (existing) {
		existing.bringToFront();
		return;
	}
	new HandoutApplication(page, spectate).render(true);
}
