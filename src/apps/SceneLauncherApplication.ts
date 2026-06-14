import { SvelteApplicationMixin } from '../mixins/SvelteApplicationMixin.svelte.ts';
import SceneLauncher from '../svelte/SceneLauncher.svelte';

/** Compact scene-control launcher: pinned + global fullscreen splashes, launch/kill only. */
export default class SceneLauncherApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root = SceneLauncher;

	sidebarButton?: { active?: boolean };

	static override DEFAULT_OPTIONS = {
		id: 'splash-scene-launcher',
		classes: ['splash', 'themed'],
		window: {
			title: 'splash.quickAccess.title',
			icon: 'fas fa-images',
			resizable: true,
		},
		position: {
			width: 360,
		},
	};

	protected override async _prepareContext() {
		return { state: {} };
	}

	override async close(options?: object) {
		if (this.sidebarButton) {
			this.sidebarButton.active = false;
			ui.controls?.render();
		}
		return super.close(options);
	}
}

let launcher: SceneLauncherApplication | undefined;

/** Toggle the launcher from its scene-controls button. */
export async function toggleSceneLauncher(active: boolean, sidebarButton: { active?: boolean }): Promise<void> {
	if (active) {
		launcher ??= new SceneLauncherApplication();
		launcher.sidebarButton = sidebarButton;
		await launcher.render(true);
	} else {
		await launcher?.close();
	}
}
