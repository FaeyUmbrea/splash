import type { SplashPage } from '../utils/launch.ts';
import { availableActions, runSplashAction } from './splashActions.ts';

const PAGE_FORMATS = CONST.JOURNAL_ENTRY_PAGE_FORMATS;
const HandlebarsSheet = foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet;

/** Foundry doesn't allow inheriting the core text-page sheet, so this reproduces it with a splash action bar. */
export class SplashSheet extends HandlebarsSheet {
	static VIEW_PARTS = {
		content: { template: 'modules/splash/templates/splash-view.hbs', root: true },
	};

	static EDIT_PARTS = {
		header: HandlebarsSheet.EDIT_PARTS.header,
		content: { template: 'modules/splash/templates/splash-edit.hbs' },
		footer: HandlebarsSheet.EDIT_PARTS.footer,
	};

	static format = PAGE_FORMATS.HTML;

	get splashPage(): SplashPage {
		return this.document as SplashPage;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.text = { ...this.document.text };
		context.uuid = this.document.uuid;
		context.splashActions = availableActions(this.splashPage);
		return context;
	}

	async _prepareContentContext(context, _options) {
		if (this.isView) {
			context.text.enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
				context.text.content,
				{ relativeTo: this.document, secrets: this.document.isOwner },
			);
		}
	}

	/** Re-rendering over an in-progress edit would discard unsaved ProseMirror changes. */
	_canRender(options) {
		if (options.resync || !this.rendered || !this.options.window.frame) return true;
		return !this._isEditorDirty();
	}

	_isEditorDirty(): boolean {
		const editor = this.form?.querySelector('prose-mirror') as { isDirty?: () => boolean } | null;
		return editor?.isDirty?.() ?? false;
	}

	_prepareSubmitData(event, form, formData, updateData) {
		const submitData = super._prepareSubmitData(event, form, formData, updateData);
		// Clear stored markdown so HTML edits re-convert cleanly, mirroring the core text sheet.
		if (SplashSheet.format === PAGE_FORMATS.HTML && this._isEditorDirty()) {
			foundry.utils.mergeObject(submitData, { text: { format: PAGE_FORMATS.HTML, markdown: '' } });
		}
		return submitData;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		const page = this.splashPage;
		this.element.querySelectorAll<HTMLElement>('[data-splash-action]').forEach((btn) => {
			btn.addEventListener('click', () => runSplashAction(btn.dataset.splashAction ?? '', page));
		});
	}
}
