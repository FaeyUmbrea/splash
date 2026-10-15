import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSyncSocket } from '../sync.ts';

/** Saved page fixture with independently controllable playback mode and read access. */
class Page {
	id = 'page';
	uuid = 'JournalEntry.journal.JournalEntryPage.page';
	type = 'splash.splash';
	system = { mode: 'synced', states: { initial: {} }, children: [] };
	testUserPermission = vi.fn(() => true);
	/** Expose a saved value owned by another client for field-edit preservation checks. */
	getFlag = vi.fn(() => ({ loadedStates: ['initial'], values: { existing: 'keep' }, overrides: {} }));
	update = vi.fn(async () => {});
}

let receive: (event: unknown, senderId: string) => Promise<void>;
let page: Page;
const snapshot = { loadedStates: ['initial'], values: { answer: 'yes' }, overrides: {} };

/** Deliver a state proxy through the registered receiver and flush its queued flag write. */
async function proxy(value: unknown = snapshot, senderId = 'player'): Promise<void> {
	await receive({ eventType: 'splashStateProxy', senderId, payload: { uuid: page.uuid, snapshot: value } }, senderId);
	await vi.runAllTimersAsync();
}

beforeEach(() => {
	vi.useFakeTimers();
	page = new Page();
	vi.stubGlobal('JournalEntryPage', Page);
	vi.stubGlobal('fromUuid', vi.fn(async () => page));
	vi.stubGlobal('game', {
		userId: 'gm',
		users: { activeGM: { id: 'gm' }, get: (id: string) => ['player', 'gm'].includes(id) ? { id, isGM: id === 'gm' } : undefined },
		socket: { on: (_channel: string, listener: typeof receive) => { receive = listener; } },
	});
	registerSyncSocket();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('shared playback requests', () => {
	it('applies validated field edits without replacing another client’s saved values', async () => {
		await receive({ eventType: 'splashStateProxy', payload: { uuid: page.uuid, changes: { states: {}, values: [{ key: 'answer', value: 'yes' }], overrides: {} } } }, 'player');
		await vi.runAllTimersAsync();
		expect(page.update).toHaveBeenCalledWith({ 'flags.splash.==runtime': { loadedStates: ['initial'], values: { existing: 'keep', answer: 'yes' }, overrides: {} } });
	});

	it('persists a readable shared page’s state on the active GM', async () => {
		await proxy();
		expect(page.update).toHaveBeenCalledWith({ 'flags.splash.==runtime': snapshot });
	});

	it('rejects a player who cannot read the page', async () => {
		page.testUserPermission.mockReturnValue(false);
		await proxy();
		expect(page.update).not.toHaveBeenCalled();
	});

	it('rejects an unknown sender', async () => {
		await proxy(snapshot, 'missing');
		expect(page.update).not.toHaveBeenCalled();
	});

	it('does not write a shared runtime flag onto a local-mode page', async () => {
		page.system.mode = 'local';
		await proxy();
		expect(page.update).not.toHaveBeenCalled();
	});

	it.each([
		{ ...snapshot, loadedStates: 'initial' },
		{ ...snapshot, values: null },
		{ ...snapshot, overrides: { object: null } },
	])('ignores a malformed snapshot: %j', async (value) => {
		await proxy(value);
		expect(page.update).not.toHaveBeenCalled();
	});

	it('uses the server-verified sender instead of a forged GM ID in the payload', async () => {
		page.testUserPermission.mockReturnValue(false);
		await receive({ eventType: 'splashStateProxy', senderId: 'gm', payload: { uuid: page.uuid, snapshot } }, 'player');
		await vi.runAllTimersAsync();
		expect(page.update).not.toHaveBeenCalled();
	});

	it('rejects malformed field edits without falling back to an accompanying snapshot', async () => {
		await receive({ eventType: 'splashStateProxy', payload: { uuid: page.uuid, snapshot, changes: { states: {}, values: [{ key: 'answer' }], overrides: {} } } }, 'player');
		await vi.runAllTimersAsync();
		expect(page.update).not.toHaveBeenCalled();
	});
});
