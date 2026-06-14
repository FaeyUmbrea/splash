import { SvelteApplicationMixin } from '../mixins/SvelteApplicationMixin.svelte.ts';
import Manager from '../svelte/manager/Manager.svelte';

/** The central management UI: browse/create/launch every splash across all journals. Opened from settings. */
export default class SplashManager extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root = Manager;

	static override DEFAULT_OPTIONS = {
		id: 'splash-manager',
		classes: ['splash', 'themed'],
		window: {
			title: 'splash.manager.title',
			icon: 'fas fa-images',
			resizable: true,
		},
		position: {
			width: 760,
			height: 640,
		},
	};

	protected override async _prepareContext() {
		return { state: {} };
	}
}

let manager: SplashManager | undefined;

/** Open (or focus) the singleton manager window. */
export function openSplashManager(): void {
	manager ??= new SplashManager();
	void manager.render(true);
}
