import type { SplashPage } from '../utils/launch.ts';
import { SvelteApplicationMixin } from '../mixins/SvelteApplicationMixin.svelte.ts';
import TriggersPanel from '../svelte/TriggersPanel.svelte';

/** Per-splash trigger management window. */
export default class SplashTriggersApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root = TriggersPanel;

	#uuid: string;
	#name: string;

	constructor(uuid: string, name: string, options: object = {}) {
		super(options);
		this.#uuid = uuid;
		this.#name = name;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['splash', 'themed'],
		window: {
			title: 'splash.triggers.title',
			icon: 'fas fa-bolt',
			resizable: true,
		},
		position: {
			width: 440,
		},
	};

	protected override async _prepareContext() {
		return { state: {}, splashUuid: this.#uuid, splashName: this.#name };
	}
}

/** Open the triggers window for a splash. */
export function openSplashTriggersApp(page: SplashPage): void {
	new SplashTriggersApplication(page.uuid, page.name ?? '', { id: `splash-triggers-${page.id}` }).render(true);
}
