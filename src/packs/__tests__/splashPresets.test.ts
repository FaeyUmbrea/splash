import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards the committed `Splash Presets` source that `yarn build:packs` compiles. It is generated from
 * `tumblerLock.build()`, so these assertions catch a stale regeneration.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceFile = path.resolve(here, '../splash-presets/tumbler-lock.json');

interface Sprite { id: string; name: string; type: string; groupId: string | null; effects?: unknown[]; states?: Record<string, unknown>; context?: Record<string, unknown>; onClick?: { type: string } }

function load() {
	const journal = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
	const page = journal.pages[0];
	const sprites = page.system.payload.value as Sprite[];
	return { journal, page, sprites };
}

describe('splash-presets compendium source', () => {
	it('is a JournalEntry holding one splash.preset spriteGroup page, keyed for the cli', () => {
		const { journal, page } = load();
		expect(journal._key).toBe(`!journal!${journal._id}`);
		expect(page._key).toBe(`!journal.pages!${journal._id}.${page._id}`);
		expect(page.type).toBe('splash.preset');
		expect(page.system.payload.type).toBe('spriteGroup');
		// Behavior-backed: applying it prompts for the code word instead of stamping the baked sprites.
		expect(page.system.behavior).toBe('tumbler-lock');
	});

	it('ships the OPEN tumbler: 4 wheels (6 parts each) plus an unlock button', () => {
		const { sprites } = load();
		expect(sprites).toHaveLength(4 * 6 + 1);
		const wheels = new Set(sprites.filter(s => s.groupId).map(s => s.groupId));
		expect(wheels.size).toBe(4);
		for (const wheel of wheels) {
			const members = sprites.filter(s => s.groupId === wheel).map(s => s.name).sort();
			expect(members).toEqual(['Body', 'Bottom', 'Down', 'Middle', 'Top', 'Up']);
		}
	});

	it('keeps the unlock button ungrouped with context.Wheels pointing at real wheel groups', () => {
		const { sprites } = load();
		const unlock = sprites.find(s => s.name === 'Unlock')!;
		expect(unlock.groupId).toBeNull();
		expect(unlock.onClick?.type).toBe('script');
		expect(unlock.context?.Keyword).toBe('OPEN');
		const wheelGroups = sprites.filter(s => s.name === 'Body').map(s => s.groupId);
		expect(unlock.context?.Wheels).toEqual(wheelGroups);
	});

	it('gives every sprite a unique id, an effects array, and a single placement', () => {
		const { sprites } = load();
		const ids = sprites.map(s => s.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const s of sprites) {
			expect(Array.isArray(s.effects)).toBe(true);
			expect(Object.keys(s.states ?? {})).toHaveLength(1);
		}
	});
});
