import type { SplashCreate, SplashModel } from '../../datamodel/SplashModel.ts';
import type { EditorDraft } from './editorData.ts';

/** The document operations needed by draft persistence, without the editor depending on a complete Foundry document. */
export interface EditorPage {
	uuid: string;
	system: Pick<SplashModel, 'toObject' | 'schema'>;
	update: (changes: Record<string, unknown>, options?: object) => Promise<unknown>;
}

/** Own an editable draft, its undo history and ordered writes to one Foundry page. Failed writes retain the draft until retry. */
export class DocumentStore<Page extends EditorPage = EditorPage> {
	readonly page: Page;
	data = $state<EditorDraft>({} as EditorDraft);
	error = $state<string | null>(null);
	saving = $state(false);
	#hookId: number;
	#history: EditorDraft[] = [];
	historyIndex = $state(0);
	historyLength = $state(1);
	#pending: (() => Promise<unknown>)[] = [];
	#flushing?: Promise<void>;
	#disposed = false;

	readonly canUndo = $derived(this.historyIndex > 0);
	readonly canRedo = $derived(this.historyIndex < this.historyLength - 1);

	constructor(page: Page) {
		this.page = page;
		this.data = page.system.toObject() as EditorDraft;
		this.#history = [foundry.utils.deepClone(this.data)];
		this.#hookId = Hooks.on('updateJournalEntryPage', (doc: JournalEntryPage) => {
			if (doc.uuid !== this.page.uuid || this.saving || this.error) return;
			this.#adoptServer();
		});
	}

	/** Compare stored data to a schema-cleaned draft so server defaults do not create phantom history entries. */
	#cleanedMirror(): EditorDraft {
		try {
			return this.page.system.schema.clean(foundry.utils.deepClone(this.data) as SplashCreate) as unknown as EditorDraft;
		} catch {
			return this.data;
		}
	}

	/** Adopt external edits after local writes settle, keeping earlier write echoes out of the draft and history. */
	#adoptServer(): void {
		if (this.#disposed) return;
		const server = this.page.system.toObject() as EditorDraft;
		if (foundry.utils.objectsEqual(server, this.#cleanedMirror())) return;
		this.data = server;
		this.#record();
	}

	/** Change the draft immediately and queue its corresponding atomic Foundry update. */
	write(mutate: (draft: EditorDraft) => void, changes: Record<string, unknown>, options: object = {}): void {
		mutate(this.data);
		this.#record();
		const payload = foundry.utils.deepClone(changes);
		void this.#enqueue(() => this.page.update(payload, options));
	}

	/** Record a distinct draft and discard any redo branch replaced by a new edit. */
	#record(): void {
		if (foundry.utils.objectsEqual(this.data, this.#history[this.historyIndex])) return;
		this.#history = this.#history.slice(0, this.historyIndex + 1);
		this.#history.push(foundry.utils.deepClone(this.data));
		this.historyIndex = this.#history.length - 1;
		this.historyLength = this.#history.length;
	}

	/** Serialize updates; after failure, local edits stay in the draft until a full retry saves them together. */
	#enqueue(persist: () => Promise<unknown>): Promise<void> {
		if (this.error || this.#disposed) return Promise.resolve();
		this.#pending.push(persist);
		if (this.#flushing) return this.#flushing;
		this.saving = true;
		this.#flushing = Promise.resolve().then(() => this.#flush());
		return this.#flushing;
	}

	/** Drain ordered writes and surface a rejection without dropping editing or undo state. */
	async #flush(): Promise<void> {
		try {
			while (this.#pending.length) {
				const persist = this.#pending.shift()!;
				await persist();
			}
			this.#adoptServer();
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
			this.#pending = [];
			console.error('Splash | Could not save editor changes. The editable draft has been retained.', error);
		} finally {
			this.saving = false;
			this.#flushing = undefined;
		}
	}

	/** Restore the previous draft immediately, with its save ordered after earlier edits. */
	async undo(): Promise<void> {
		if (!this.canUndo) return;
		this.historyIndex -= 1;
		await this.#apply(this.#history[this.historyIndex]);
	}

	/** Restore the next draft using the same save and failure handling as undo. */
	async redo(): Promise<void> {
		if (!this.canRedo) return;
		this.historyIndex += 1;
		await this.#apply(this.#history[this.historyIndex]);
	}

	/** Save the latest complete draft after a rejection, including edits and undo performed while unsaved. */
	async retry(): Promise<void> {
		if (!this.error || this.#disposed) return;
		this.error = null;
		await this.#persistSnapshot();
	}

	/** Replace the local draft from history without recording a new history entry. */
	async #apply(snapshot: EditorDraft): Promise<void> {
		this.data = foundry.utils.deepClone(snapshot);
		await this.#persistSnapshot();
	}

	/** Capture the current draft before queueing a whole-system replacement. */
	#persistSnapshot(): Promise<void> {
		const snapshot = foundry.utils.deepClone(this.data);
		const changes: Record<string, unknown> = { system: snapshot };
		return this.#enqueue(() => this.page.update(changes, { recursive: false }));
	}

	/** Wait for submitted writes before an application decides whether it can close safely. */
	async settle(): Promise<void> {
		await this.#flushing;
	}

	/** Stop observing this page; already submitted writes may settle without touching a closed editor. */
	destroy(): void {
		this.#disposed = true;
		Hooks.off('updateJournalEntryPage', this.#hookId);
	}
}
