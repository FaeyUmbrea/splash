import type { SplashCreate } from '../../datamodel/SplashModel.ts';
import type { SplashPage } from '../../utils/launch.ts';

/** Reactive store over a page's `system` data. `write()` mutates a mirror optimistically then fires an atomic `update()`; the hook re-syncs the mirror only on external edits. */
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
			const server = this.page.system.toObject() as SplashCreate;
			// Compare against a schema-cleaned mirror so the server's filled-in defaults don't make our own echo look like an external edit.
			if (foundry.utils.objectsEqual(server, this.#cleanedMirror())) return;
			this.data = server;
			this.#record();
		});
	}

	/** The mirror cleaned to the schema's stored shape, matching what `toObject()` echoes. */
	#cleanedMirror(): SplashCreate {
		try {
			return this.page.system.schema.clean(foundry.utils.deepClone(this.data)) as unknown as SplashCreate;
		} catch {
			return this.data;
		}
	}

	write(mutate: (draft: SplashCreate) => void, persist: () => Promise<unknown>): void {
		mutate(this.data);
		this.#record();
		void persist();
	}

	#record(): void {
		if (this.#applying) return;
		this.#history = this.#history.slice(0, this.historyIndex + 1);
		this.#history.push(foundry.utils.deepClone(this.data));
		this.historyIndex = this.#history.length - 1;
		this.historyLength = this.#history.length;
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
		this.data = foundry.utils.deepClone(snapshot);
		await this.page.update({ system: foundry.utils.deepClone(snapshot) }, { recursive: false });
		this.#applying = false;
	}

	destroy(): void {
		Hooks.off('updateJournalEntryPage', this.#hookId);
	}
}
