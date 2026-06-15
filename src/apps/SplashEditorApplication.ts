import type { SplashPage } from '../utils/launch.ts';
import { SvelteApplicationMixin } from '../mixins/SvelteApplicationMixin.svelte.ts';
import Editor from '../svelte/editor/Editor.svelte';

/**
 * The splash editor as a normal (large, z-managed) Foundry window — NOT a z-index-hacked frameless
 * overlay. Foundry then stacks pop-outs opened from it (file pickers, dialogs) above it naturally.
 */
export default class SplashEditorApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root = Editor;

	#page: SplashPage;

	constructor(page: SplashPage, options: object = {}) {
		super(options);
		this.#page = page;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['splash', 'themed', 'splash-editor-window'],
		window: {
			resizable: true,
			contentClasses: ['splash-editor-content'],
		},
		position: {
			width: 1280,
			height: 820,
		},
	};

	override get title(): string {
		return `Splash Editor — ${this.#page.name}`;
	}

	protected override async _prepareContext() {
		return { state: {}, page: this.#page };
	}

	protected override _onFirstRender(context: object, options: object) {
		// @ts-expect-error base signature is loose in fvtt-types
		super._onFirstRender?.(context, options);
		// Open large but not edge-to-edge — 100px margin each side reads as a window, not fullscreen.
		this.setPosition({ left: 100, top: 0, width: globalThis.innerWidth - 200, height: globalThis.innerHeight });
	}
}

/** Open the editor window for a splash. */
export function openSplashEditorApp(page: SplashPage): void {
	new SplashEditorApplication(page, { id: 'splash-editor' }).render(true);
}
