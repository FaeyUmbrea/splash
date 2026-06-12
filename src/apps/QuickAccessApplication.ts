import { SvelteApplicationMixin } from '../mixins/SvelteApplicationMixin.svelte.ts';
import QuickAccess from '../svelte/QuickAccess.svelte';
import { listTriggerableSplashPages } from '../utils/launch.ts';

/** Small window listing every splash the user may trigger, opened from scene controls. */
export default class QuickAccessApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root = QuickAccess;

	sidebarButton?: { active?: boolean };

	static override DEFAULT_OPTIONS = {
		id: 'splash-quick-access',
		window: {
			title: 'splash.quickAccess.title',
			icon: 'fas fa-images',
			resizable: true,
		},
		position: {
			width: 420,
		},
	};

	protected override async _prepareContext() {
		return {
			state: {},
			pages: listTriggerableSplashPages().map(page => ({
				uuid: page.uuid,
				name: page.name ?? '',
				journal: page.parent?.name ?? '',
			})),
		};
	}

	override async close(options?: object) {
		if (this.sidebarButton) {
			this.sidebarButton.active = false;
			ui.controls?.render();
		}
		return super.close(options);
	}
}

let quickAccess: QuickAccessApplication | undefined;

/** Toggle the quick-access window from its scene-controls button. */
export async function toggleQuickAccess(active: boolean, sidebarButton: { active?: boolean }): Promise<void> {
	if (active) {
		quickAccess ??= new QuickAccessApplication();
		quickAccess.sidebarButton = sidebarButton;
		await quickAccess.render(true);
	} else {
		await quickAccess?.close();
	}
}
