import type { SplashCreate } from '../../datamodel/SplashModel.ts';
import type { SplashPage } from '../../utils/launch.ts';

/**
 * A reactive store over a splash page's `system` data. `data` is a mirror that `write()` mutates
 * optimistically before firing an atomic `document.update()`; the update hook re-syncs the mirror only on
 * external edits, so our own writes never flicker. Undo history replays the same optimistic-then-atomic way.
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
			const server = this.page.system.toObject() as SplashCreate;
			// Ignore the echo of our own writes. Compare against a schema-cleaned mirror, not the raw one: the
			// optimistic mirror holds partial-shaped data (defaults the server fills in), so a raw compare is
			// always unequal and would re-adopt the echo as a phantom undo step.
			if (foundry.utils.objectsEqual(server, this.#cleanedMirror())) return;
			// A genuine external edit (another client, or a non-optimistic path): adopt and record it.
			this.data = server;
			this.#record();
		});
	}

	/** The optimistic mirror normalized to the schema's stored shape, matching what `toObject()` echoes. */
	#cleanedMirror(): SplashCreate {
		try {
			return this.page.system.schema.clean(foundry.utils.deepClone(this.data)) as unknown as SplashCreate;
		} catch {
			return this.data;
		}
	}

	/** Optimistically mutate the local mirror, record undo history, then persist atomically. */
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
