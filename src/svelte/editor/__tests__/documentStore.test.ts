import type { SplashPage } from '../../../utils/launch.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentStore } from '../documentStore.svelte.ts';

/** Clone the plain-data persistence fixtures, including reactive drafts. */
function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

/** Provide a page with a server snapshot, update hook and controllable write failures. */
function fixture() {
	let server = { values: { answer: 'initial' }, states: {}, children: [] };
	let hook: (doc: { uuid: string }) => void = () => {};
	const page = {
		id: 'page',
		uuid: 'JournalEntry.journal.JournalEntryPage.page',
		system: { toObject: () => clone(server), schema: { clean: clone } },
		update: vi.fn(async (change: Record<string, unknown>) => {
			server = clone(change.system) as typeof server;
			hook(page);
		}),
	};
	vi.stubGlobal('Hooks', {
		on: vi.fn((_name, callback) => {
			hook = callback;
			return 1;
		}),
		off: vi.fn(),
	});
	return { page, store: new DocumentStore(page as unknown as SplashPage), notify: (uuid: string) => hook({ uuid }) };
}

/** Change an answer through the same draft-plus-update contract used by the editor model. */
function writeAnswer(store: DocumentStore, answer: string): void {
	store.write((draft) => {
		draft.values = { answer };
	}, { system: { ...clone(store.data), values: { answer } } });
}

beforeEach(() => {
	vi.stubGlobal('foundry', { utils: { deepClone: clone, objectsEqual: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b) } });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('editor draft persistence', () => {
	it('keeps a rejected draft editable and saves the latest undo/redo result on retry', async () => {
		const { page, store } = fixture();
		page.update.mockRejectedValueOnce(new Error('write rejected'));
		writeAnswer(store, 'first');
		await vi.waitFor(() => expect(store.error).toBe('write rejected'));
		writeAnswer(store, 'second');
		await store.undo();
		expect(store.data.values?.answer).toBe('first');
		await store.redo();
		expect(store.data.values?.answer).toBe('second');
		expect(page.update).toHaveBeenCalledOnce();
		await store.retry();
		expect(store.error).toBeNull();
		expect(page.system.toObject().values.answer).toBe('second');
		expect(store.canUndo).toBe(true);
		store.destroy();
	});

	it('keeps an undo failure recoverable and never gets stuck suppressing history', async () => {
		const { page, store } = fixture();
		writeAnswer(store, 'edited');
		await store.settle();
		page.update.mockRejectedValueOnce(new Error('undo rejected'));
		await store.undo();
		expect(store.error).toBe('undo rejected');
		expect(store.canRedo).toBe(true);
		writeAnswer(store, 'recovered');
		await store.retry();
		expect(page.system.toObject().values.answer).toBe('recovered');
		expect(store.canUndo).toBe(true);
		expect(store.canRedo).toBe(false);
		store.destroy();
	});

	it('survives a synchronous persistence exception and can retry', async () => {
		const { page, store } = fixture();
		page.update.mockImplementationOnce(() => {
			throw new Error('synchronous failure');
		});
		writeAnswer(store, 'retained');
		await store.settle();
		expect(store.error).toBe('synchronous failure');
		await store.retry();
		expect(store.error).toBeNull();
		expect(page.system.toObject().values.answer).toBe('retained');
		store.destroy();
	});

	it('orders overlapping writes without replacing a newer draft with the first write echo', async () => {
		const { page, store } = fixture();
		let finish!: () => void;
		const first = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const update = page.update.getMockImplementation()!;
		page.update.mockImplementationOnce(async (change) => {
			await first;
			await update(change);
		});
		writeAnswer(store, 'first');
		writeAnswer(store, 'second');
		expect(page.update).not.toHaveBeenCalled();
		expect(store.data.values?.answer).toBe('second');
		finish();
		await store.settle();
		expect(page.system.toObject().values.answer).toBe('second');
		expect(store.historyLength).toBe(3);
		store.destroy();
	});

	it('ignores other pages and preserves a failed draft when server hooks arrive', async () => {
		const { page, store, notify } = fixture();
		page.update.mockRejectedValueOnce(new Error('offline'));
		writeAnswer(store, 'draft');
		await store.settle();
		notify('JournalEntry.other.JournalEntryPage.page');
		notify('JournalEntry.journal.JournalEntryPage.page');
		expect(store.data.values?.answer).toBe('draft');
		expect(store.historyLength).toBe(2);
		store.destroy();
	});
});
