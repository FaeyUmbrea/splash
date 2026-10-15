import type { SplashPage } from '../utils/launch.ts';
import SplashUI from '../svelte/SplashUI.svelte';
import { SvelteRenderer } from './SvelteRenderer.ts';

/** Include the parent journal so native imports retaining page IDs have independent windows. */
function handoutId(uuid: string): string {
	return `splash-handout-${uuid}`;
}

/** Windowed playback of one saved Splash page. */
class HandoutApplication extends SvelteRenderer {
	#title: string;

	constructor(page: SplashPage, spectate = false) {
		// Not resizable: the runtime renderer draws sprites at raw coordinates, so resizing only clips.
		const size = (page.system as { handoutSize?: { width?: number; height?: number } | null }).handoutSize;
		super(
			SplashUI,
			{ splashConfig: page.system, pageUuid: page.uuid, spectate },
			{
				id: handoutId(page.uuid),
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

/** Open this page, or focus its existing window without confusing another journal's embedded ID. */
export async function openHandout(page: SplashPage, spectate = false): Promise<void> {
	const existing = foundry.applications.instances.get(handoutId(page.uuid));
	if (existing) {
		existing.bringToFront();
		return;
	}
	new HandoutApplication(page, spectate).render(true);
}

/** Close only the requested saved page's window, including imported pages with duplicate embedded IDs. */
export async function closeHandout(uuid: string): Promise<void> {
	await foundry.applications.instances.get(handoutId(uuid))?.close();
}
