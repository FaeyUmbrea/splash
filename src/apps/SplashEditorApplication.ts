import type { SplashPage } from '../utils/launch.ts';
import { SvelteApplicationMixin } from '../mixins/SvelteApplicationMixin.svelte.ts';
import Editor from '../svelte/editor/Editor.svelte';
import { EditorModel } from '../svelte/editor/editorModel.svelte.ts';

/**
 * A z-managed window, not a frameless overlay, so Foundry stacks pop-outs (file pickers, dialogs) above it.
 */
export default class SplashEditorApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	protected override root = Editor;

	#page: SplashPage;
	#model: EditorModel;
	#confirmingClose = false;

	constructor(page: SplashPage, options: object = {}) {
		super(options);
		this.#page = page;
		this.#model = new EditorModel(page);
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
		return game.i18n?.format('splash.app.splashEditorApplication.title', { name: this.#page.name }) ?? this.#page.name ?? 'Splash';
	}

	protected override async _prepareContext() {
		return { state: {}, model: this.#model };
	}

	/** Finish pending saves and ask before discarding a draft that the server rejected. */
	override async close(options?: object) {
		if (this.#confirmingClose) return this;
		this.#confirmingClose = true;
		try {
			await this.#model.store.settle();
			if (this.#model.store.error) {
				const i18n = game.i18n;
				if (!i18n) return this;
				const discard = await foundry.applications.api.DialogV2.confirm({
					window: { title: i18n.localize('splash.editor.save.closeTitle') },
					content: `<p>${i18n.localize('splash.editor.save.closeWarning')}</p>`,
				}).catch(() => false);
				if (!discard) return this;
			}
			const result = await super.close(options);
			this.#model.destroy();
			return result;
		} finally {
			this.#confirmingClose = false;
		}
	}

	protected override async _onFirstRender(context: object, options: object) {
		await super._onFirstRender?.(context, options);
		this.setPosition({ left: 100, top: 0, width: globalThis.innerWidth - 200, height: globalThis.innerHeight });
	}
}

export function openSplashEditorApp(page: SplashPage): void {
	new SplashEditorApplication(page, { id: 'splash-editor' }).render(true);
}
