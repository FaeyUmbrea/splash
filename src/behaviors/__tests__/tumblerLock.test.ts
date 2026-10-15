import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { tumblerLock } from '../tumblerLock.ts';

/** Build a prefab for structural checks against its stored sprite records. */
function build(codeword: string) {
	return tumblerLock.build({ codeword }, { stateKey: 'initial' }) as Array<Record<string, any>>;
}

describe('tumblerLock.build', () => {
	it('generates one wheel per letter (6 sprites each) plus an unlock button', () => {
		const sprites = build('OPEN');
		expect(sprites).toHaveLength(4 * 6 + 1);
		expect(sprites.filter(s => s.name === 'Unlock')).toHaveLength(1);
	});

	it('groups each wheel under its own groupId and leaves the unlock button ungrouped', () => {
		const sprites = build('AB');
		const groups = new Set(sprites.filter(s => s.groupId).map(s => s.groupId));
		expect(groups.size).toBe(2);
		const unlock = sprites.find(s => s.name === 'Unlock')!;
		expect(unlock.groupId).toBeNull();
	});

	it('names the parts so the macros can address them', () => {
		const sprites = build('AB');
		const wheel0 = sprites[0].groupId;
		const members = sprites.filter(s => s.groupId === wheel0).map(s => s.name).sort();
		expect(members).toEqual(['Body', 'Bottom', 'Down', 'Middle', 'Top', 'Up']);
	});

	it('wires the rotate macro + direction context on the arrows', () => {
		const sprites = build('A');
		const up = sprites.find(s => s.name === 'Up')!;
		const down = sprites.find(s => s.name === 'Down')!;
		expect(up.onClick.type).toBe('script');
		expect(up.context).toEqual({ Direction: 1 });
		expect(down.context).toEqual({ Direction: -1 });
		expect(up.onClick.source).toContain('child.get(\'Middle\')');
	});

	it('gives the unlock button the keyword and the ordered wheel ids', () => {
		const sprites = build('OPEN');
		const unlock = sprites.find(s => s.name === 'Unlock')!;
		expect(unlock.context.Keyword).toBe('OPEN');
		expect(unlock.context.Wheels).toHaveLength(4);
		const wheelGroupsInOrder = sprites.filter(s => s.name === 'Body').map(s => s.groupId);
		expect(unlock.context.Wheels).toEqual(wheelGroupsInOrder);
	});

	it('uppercases and strips non-letters, defaulting to OPEN when empty', () => {
		expect(build('o p3n!')[0]).toBeTruthy();
		const wheels = (w: string) => build(w).filter(s => s.name === 'Body').length;
		expect(wheels('cat')).toBe(3);
		expect(wheels('a1b2c3')).toBe(3);
		expect(wheels('')).toBe(4);
	});

	it('places every sprite in the target state', () => {
		const sprites = build('A');
		expect(sprites.every(s => s.states.initial)).toBe(true);
	});
});

/** Execute the generated unlock script with the same globals and scope tree available during playback. */
function tryCombination(displayed: string) {
	const sprites = tumblerLock.build({ codeword: 'OPEN' }, { stateKey: 'initial' });
	const unlock = sprites.find(sprite => sprite?.type === 'button' && sprite.name === 'Unlock');
	if (unlock?.type !== 'button' || unlock.onClick?.type !== 'script' || !unlock.onClick.source) {
		throw new Error('The tumbler prefab has no unlock script.');
	}
	const context = unlock.context;
	const wheels = context?.Wheels;
	if (!Array.isArray(wheels)) throw new Error('The unlock script has no wheel references.');
	const child = new Map(wheels.map((id, index) => [id, { child: new Map([['Middle', { text: displayed[index] }]]) }]));
	const api = { unlockDoor: vi.fn(), close: vi.fn() };
	const notifications = { info: vi.fn(), warn: vi.fn() };
	runInNewContext(unlock.onClick.source, {
		scope: { parent: { child } },
		context,
		api,
		game: { i18n: { localize: (key: string) => key } },
		ui: { notifications },
	});
	return { api, notifications };
}

describe('tumbler prefab playback', () => {
	it('unlocks and closes for the configured word using only playback globals', () => {
		const { api, notifications } = tryCombination('OPEN');
		expect(api.unlockDoor).toHaveBeenCalledOnce();
		expect(api.close).toHaveBeenCalledOnce();
		expect(notifications.info).toHaveBeenCalledWith('splash.behavior.tumblerLock.unlocked');
		expect(notifications.warn).not.toHaveBeenCalled();
	});

	it('keeps the puzzle open for a wrong combination', () => {
		const { api, notifications } = tryCombination('AAAA');
		expect(api.unlockDoor).not.toHaveBeenCalled();
		expect(api.close).not.toHaveBeenCalled();
		expect(notifications.warn).toHaveBeenCalledWith('splash.behavior.tumblerLock.wrongCombination');
	});
});
