import type { ActionInitialized, SplashInitialized } from '../../datamodel/SplashModel.ts';
import type { RuntimeSnapshot, SplashRuntime } from '../../renderer/SplashRuntime.ts';
import { isDeepStrictEqual } from 'node:util';
import { afterEach, expect, it, vi } from 'vitest';
import { clearVotes, createSyncDriver, getVotes, registerSyncSocket } from '../sync.ts';

/** Saved page shared by two driver fixtures, with real receiver writes updating its runtime flag. */
class Page {
	id = 'page';
	uuid = 'JournalEntry.journal.JournalEntryPage.page';
	type = 'splash.splash';
	system = { mode: 'synced', states: { initial: {} }, children: [] };
	stored: RuntimeSnapshot = { loadedStates: ['initial'], values: { typed: 'third' }, overrides: {} };
	/** Allow both clients to exercise synchronization without an unrelated permission rejection. */
	testUserPermission = () => true;
	/** Supply the latest snapshot to connecting drivers. */
	getFlag = () => this.stored;
	/** Model the receiver's complete runtime-flag replacement. */
	update = vi.fn(async (changes: Record<string, RuntimeSnapshot>) => { this.stored = changes['flags.splash.==runtime']; });
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

/** Connect GM and player drivers to one saved page and capture the actual emitted player messages. */
async function connectClients() {
	vi.useFakeTimers();
	const page = new Page();
	const emit = vi.fn();
	let receive!: (event: unknown, sender: string) => Promise<void>;
	const client = {
		userId: 'gm',
		users: { activeGM: { id: 'gm' }, get: (id: string) => ({ id, isGM: id === 'gm' }) },
		socket: { emit, on: (_channel: string, listener: typeof receive) => { receive = listener; } },
	};
	vi.stubGlobal('JournalEntryPage', Page);
	vi.stubGlobal('fromUuid', vi.fn(async () => page));
	vi.stubGlobal('game', client);
	vi.stubGlobal('foundry', { utils: { equals: isDeepStrictEqual } });
	registerSyncSocket();
	const runtime = { snapshot: page.stored, applyShared: vi.fn(async () => {}) } as unknown as SplashRuntime;
	const gm = createSyncDriver(page.uuid, page.system as unknown as SplashInitialized, runtime);
	await gm.connect();
	client.userId = 'player';
	const player = createSyncDriver(page.uuid, page.system as unknown as SplashInitialized, runtime);
	await player.connect();
	return { page, client, gm, player, emit, receive };
}

it('preserves independent GM and player edits made from the same shared state', async () => {
	const { page, client, gm, player, emit, receive } = await connectClients();
	client.userId = 'gm';
	gm.onChanged({ ...page.stored, values: { typed: 'third', level: '80' } });
	client.userId = 'player';
	player.onChanged({ ...page.stored, values: { typed: 'concurrent' } });
	await vi.runAllTimersAsync();
	client.userId = 'gm';
	await receive(emit.mock.calls[0][1], 'player');
	await vi.runAllTimersAsync();

	expect(page.stored.values).toEqual({ typed: 'concurrent', level: '80' });
	gm.dispose();
	player.dispose();
});

it('counts both increments when GM and player act before either receives a shared update', async () => {
	const { page, client, gm, player, emit, receive } = await connectClients();
	const action = { type: 'increment-value', key: 'count', step: 1 } as ActionInitialized;
	Object.assign(page.system, { children: [{ id: 'counter', type: 'button', onClick: action }] });
	const before = { ...page.stored, values: { typed: 'third', count: 0 } };
	page.stored = before;
	client.userId = 'gm';
	if (!gm.interceptAction(action)) gm.onChanged({ ...before, values: { typed: 'third', count: 1 } });
	client.userId = 'player';
	if (!player.interceptAction(action)) player.onChanged({ ...before, values: { typed: 'third', count: 1 } });
	await vi.runAllTimersAsync();
	client.userId = 'gm';
	await receive(emit.mock.calls[0][1], 'player');
	await vi.runAllTimersAsync();
	expect(page.stored.values).toEqual({ typed: 'third', count: 2 });
	gm.dispose();
	player.dispose();
});

it('honours an explicit reset even before a queued increment is displayed', async () => {
	const { page, client, gm, player } = await connectClients();
	const before = { ...page.stored, values: { typed: 'third', count: '0' } };
	page.stored = before;
	gm.adopt(before);
	client.userId = 'gm';
	const increment = { type: 'increment-value', key: 'count', step: 1 } as ActionInitialized;
	if (!gm.interceptAction(increment)) gm.onChanged({ ...before, values: { ...before.values, count: '1' } });
	const reset = { type: 'set-value', key: 'count', value: '0' } as ActionInitialized;
	if (!gm.interceptAction(reset)) gm.onChanged(before);
	await vi.runAllTimersAsync();
	expect(page.stored.values.count).toBe('0');
	gm.dispose();
	player.dispose();
});

it('accepts both player increments without an open GM runtime', async () => {
	const { page, client, gm, player, emit, receive } = await connectClients();
	const action = { type: 'increment-value', key: 'count', step: 1 } as ActionInitialized;
	Object.assign(page.system, { children: [{ id: 'counter', type: 'button', onClick: action }] });
	page.stored = { ...page.stored, values: { count: 0 } };
	expect(player.interceptAction(action)).toBe(true);
	expect(player.interceptAction(action)).toBe(true);
	client.userId = 'gm';
	await Promise.all(emit.mock.calls.map(call => receive(call[1], 'player')));
	await vi.runAllTimersAsync();
	expect(page.stored.values.count).toBe(2);
	gm.dispose();
	player.dispose();
});

it('accepts an input value only for a declared text-input binding', async () => {
	const { page, client, gm, player, receive } = await connectClients();
	Object.assign(page.system, { children: [{ id: 'input', type: 'text-input', valueKey: 'answer' }] });
	client.userId = 'gm';
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: { type: 'set-value', key: 'other', value: 'ignored' } } }, 'player');
	await vi.runAllTimersAsync();
	expect(page.update).not.toHaveBeenCalled();
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: { type: 'set-value', key: 'answer', value: 'yes' } } }, 'player');
	await vi.runAllTimersAsync();
	expect(page.stored.values).toEqual({ typed: 'third', answer: 'yes' });
	gm.dispose();
	player.dispose();
});

it('records player votes and clears visible tallies without an open GM handout', async () => {
	const { page, client, gm, player, receive } = await connectClients();
	vi.stubGlobal('Hooks', { callAll: vi.fn() });
	Object.assign(page.system, {
		voteVisibility: 'all',
		children: [
			{ id: 'button', type: 'button', onClick: { type: 'vote', optionId: 'left' } },
			{ id: 'hotspot', type: 'hotspot', onClick: { type: 'vote', optionId: 'right' } },
		],
	});
	client.userId = 'gm';
	await clearVotes(page.uuid);
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: { type: 'vote', optionId: 'left' } } }, 'player');
	await vi.runAllTimersAsync();
	expect(getVotes(page.uuid).left?.count).toBe(1);
	expect(page.stored.values).toMatchObject({ 'vote:left': '1', 'vote:right': '0' });
	expect(gm.interceptAction({ type: 'vote', optionId: 'left' } as ActionInitialized)).toBe(true);
	await vi.runAllTimersAsync();
	expect(page.stored.values).toMatchObject({ 'vote:left': '2', 'vote:right': '0' });

	// Changing a vote removes the old tally instead of adding a second vote.
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: { type: 'vote', optionId: 'right' } } }, 'player');
	await vi.runAllTimersAsync();
	expect(page.stored.values).toMatchObject({ 'vote:left': '1', 'vote:right': '1' });
	await clearVotes(page.uuid);
	await vi.runAllTimersAsync();
	expect(getVotes(page.uuid)).toEqual({});
	expect(page.stored.values).toEqual({ 'typed': 'third', 'vote:left': '0', 'vote:right': '0' });
	gm.dispose();
	player.dispose();
});

it('keeps GM-only vote tallies out of the shared runtime flag', async () => {
	const { page, client, gm, player, receive } = await connectClients();
	vi.stubGlobal('Hooks', { callAll: vi.fn() });
	Object.assign(page.system, { voteVisibility: 'gm', children: [{ id: 'button', type: 'button', onClick: { type: 'vote', optionId: 'left' } }] });
	client.userId = 'gm';
	await clearVotes(page.uuid);
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: { type: 'vote', optionId: 'left' } } }, 'player');
	await vi.runAllTimersAsync();
	expect(getVotes(page.uuid).left?.count).toBe(1);
	expect(page.update).not.toHaveBeenCalled();
	await clearVotes(page.uuid);
	expect(getVotes(page.uuid)).toEqual({});
	expect(page.update).not.toHaveBeenCalled();
	gm.dispose();
	player.dispose();
});

it.each(['undeclared', 'unreadable', 'non-writer'])('rejects a %s vote request', async (reason) => {
	const { page, client, gm, player, receive } = await connectClients();
	vi.stubGlobal('Hooks', { callAll: vi.fn() });
	Object.assign(page.system, { voteVisibility: 'gm', children: [{ id: 'button', type: 'button', onClick: { type: 'vote', optionId: 'left' } }] });
	client.userId = 'gm';
	await clearVotes(page.uuid);
	if (reason === 'unreadable') vi.spyOn(page, 'testUserPermission').mockReturnValue(false);
	if (reason === 'non-writer') client.userId = 'other-gm';
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: { type: 'vote', optionId: reason === 'undeclared' ? 'other' : 'left' } } }, 'player');
	await vi.runAllTimersAsync();
	expect(getVotes(page.uuid)).toEqual({});
	expect(page.update).not.toHaveBeenCalled();
	gm.dispose();
	player.dispose();
});

it('rejects an undeclared increment payload', async () => {
	const { page, client, gm, player, receive } = await connectClients();
	Object.assign(page.system, { children: [{ id: 'counter', type: 'button', onClick: { type: 'increment-value', key: 'count', step: 1 } }] });
	client.userId = 'gm';
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: { type: 'increment-value', key: 'count', step: 10 } } }, 'player');
	await vi.runAllTimersAsync();
	expect(page.update).not.toHaveBeenCalled();
	gm.dispose();
	player.dispose();
});

it.each([
	['hotspot', 'onClick', 'set-value'],
	['hotspot', 'onClick', 'increment-value'],
	['drop-zone', 'onDrop', 'set-value'],
	['drop-zone', 'onDrop', 'increment-value'],
])('accepts a declared %s %s %s command from a player', async (type, event, actionType) => {
	const { page, client, gm, player, receive } = await connectClients();
	const action = actionType === 'set-value'
		? { type: actionType, key: 'count', value: '1' }
		: { type: actionType, key: 'count', step: 1 };
	Object.assign(page.system, { children: [{ id: 'source', type, [event]: action }] });
	page.stored = { ...page.stored, values: { count: 0 } };
	client.userId = 'gm';
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action, sourceId: 'source' } }, 'player');
	await vi.runAllTimersAsync();
	expect(page.stored.values.count).toBe(actionType === 'set-value' ? '1' : 1);

	// A supported source does not authorize a different value or increment.
	const changed = actionType === 'set-value' ? { ...action, value: '99' } : { ...action, step: 99 };
	await receive({ eventType: 'splashActionIntent', payload: { uuid: page.uuid, action: changed, sourceId: 'source' } }, 'player');
	await vi.runAllTimersAsync();
	expect(page.stored.values.count).toBe(actionType === 'set-value' ? '1' : 1);
	gm.dispose();
	player.dispose();
});

it('does not send adopted remote values back as local edits while a request is pending', async () => {
	const { page, client, gm, player, emit, receive } = await connectClients();
	client.userId = 'player';
	player.onChanged({ ...page.stored, values: { typed: 'first local edit' } });
	player.adopt({ ...page.stored, values: { typed: 'third', level: '80' } });
	player.onChanged({ ...page.stored, values: { typed: 'next local edit', level: '80' } });
	client.userId = 'gm';
	gm.onChanged({ ...page.stored, values: { typed: 'third', level: '90' } });
	await vi.runAllTimersAsync();
	await receive(emit.mock.calls[0][1], 'player');
	await vi.runAllTimersAsync();
	expect(page.stored.values).toEqual({ typed: 'next local edit', level: '90' });
	gm.dispose();
	player.dispose();
});

it('keeps a later change queued behind an in-flight document write', async () => {
	const { page, client, gm, player, emit, receive } = await connectClients();
	let finish!: () => void;
	const gate = new Promise<void>((resolve) => {
		finish = resolve;
	});
	page.update.mockImplementationOnce(async (changes) => {
		await gate;
		page.stored = changes['flags.splash.==runtime'];
	});
	client.userId = 'gm';
	gm.onChanged({ ...page.stored, values: { typed: 'third', level: '80' } });
	await vi.advanceTimersByTimeAsync(120);
	client.userId = 'player';
	player.onChanged({ ...page.stored, values: { typed: 'during save' } });
	await vi.advanceTimersByTimeAsync(120);
	client.userId = 'gm';
	await receive(emit.mock.calls[0][1], 'player');
	await vi.advanceTimersByTimeAsync(120);
	expect(page.update).toHaveBeenCalledOnce();
	finish();
	await vi.runAllTimersAsync();
	expect(page.update).toHaveBeenCalledTimes(2);
	expect(page.stored.values).toEqual({ typed: 'during save', level: '80' });
	gm.dispose();
	player.dispose();
});
