import type { SplashCreate } from '../../datamodel/SplashModel.ts';
import type { SplashPage } from '../../utils/launch.ts';

/**
 * Reactive read-mirror of a splash page's live `system` data. There is NO working copy:
 * the editor renders from `data`, and every edit goes straight to the document through
 * `edit.ts`. Whenever the document changes — this client's own atomic update, or another
 * client's — the mirror is replaced wholesale, so the editor always shows server truth.
 *
 * It also keeps an undo history: each committed change snapshots the new system data, and
 * undo/redo replay a snapshot back through `document.update` (so they're atomic too).
 */
export class DocumentStore {
	readonly page: SplashPage;
	data = $state<SplashCreate>({} as SplashCreate);
	#hookId: number;

	#history: SplashCreate[] = [];
	historyIndex = $state(0);
	historyLength = $state(1);
	#applying = false;

	readonly canUndo = $derived(this.historyIndex > 0);
	readonly canRedo = $derived(this.historyIndex < this.historyLength - 1);

	constructor(page: SplashPage) {
		this.page = page;
		this.data = page.system.toObject() as SplashCreate;
		this.#history = [foundry.utils.deepClone(this.data)];
		this.#hookId = Hooks.on('updateJournalEntryPage', (doc: JournalEntryPage) => {
			if (doc.id !== this.page.id) return;
			this.data = this.page.system.toObject() as SplashCreate;
			if (this.#applying) {
				this.#applying = false;
				return;
			}
			// New edit: drop any redo tail and push the new snapshot.
			this.#history = this.#history.slice(0, this.historyIndex + 1);
			this.#history.push(foundry.utils.deepClone(this.data));
			this.historyIndex = this.#history.length - 1;
			this.historyLength = this.#history.length;
		});
	}

	async undo(): Promise<void> {
		if (!this.canUndo) return;
		this.historyIndex -= 1;
		await this.#apply(this.#history[this.historyIndex]);
	}

	async redo(): Promise<void> {
		if (!this.canRedo) return;
		this.historyIndex += 1;
		await this.#apply(this.#history[this.historyIndex]);
	}

	async #apply(snapshot: SplashCreate): Promise<void> {
		this.#applying = true;
		await this.page.update({ system: foundry.utils.deepClone(snapshot) }, { recursive: false });
	}

	destroy(): void {
		Hooks.off('updateJournalEntryPage', this.#hookId);
	}
}
