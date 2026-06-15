import type { SplashCreate } from '../../datamodel/SplashModel.ts';
import type { SplashPage } from '../../utils/launch.ts';

/**
 * A fully reactive, atomically-updatable store wrapping a splash page's `system` data — the
 * document-backed analogue of obs-utils' settings store.
 *
 * Reads: `data` (a reactive mirror). Writes go through `write()`: the local mirror is mutated
 * OPTIMISTICALLY (so the UI updates synchronously — no round-trip snap-back) and an atomic
 * `document.update()` is fired in the background. The document's own update hook re-syncs the
 * mirror only when the server state actually differs from ours (i.e. an EXTERNAL edit), so our
 * own writes never cause a flicker.
 *
 * It also keeps an undo history; undo/redo replay snapshots the same optimistic-then-atomic way.
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
			// Our own optimistic writes already match the server — ignore the echo (no flicker).
			if (foundry.utils.objectsEqual(server, this.data)) return;
			// An external edit (another client, or a non-optimistic path): adopt and record it.
			this.data = server;
			this.#record();
		});
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
