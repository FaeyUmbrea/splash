import type { SplashPage } from '../launch.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { grantTriggerVisibility } from '../launch.ts';

/** A private parent and a page inheriting its permissions, with an unrelated sibling. */
function fixture(ownership: Record<string, number> = { default: -1 }, parentOwnership: Record<string, number> = { default: 0 }) {
	const sibling = { ownership: { default: -1 }, update: vi.fn() };
	const parent = { ownership: parentOwnership, update: vi.fn(), pages: { contents: [sibling] } };
	const page = { ownership, parent, update: vi.fn() };
	return { page, parent, sibling };
}

beforeEach(() => {
	vi.stubGlobal('game', { user: { isGM: true } });
	vi.stubGlobal('CONST', { DOCUMENT_OWNERSHIP_LEVELS: { INHERIT: -1, NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } });
});
afterEach(() => vi.unstubAllGlobals());

describe('trigger visibility', () => {
	it('grants access to the bound page without exposing its journal or siblings', async () => {
		const { page, parent, sibling } = fixture();
		await grantTriggerVisibility(page as unknown as SplashPage);
		expect(page.update).toHaveBeenCalledWith({ ownership: { default: 2 } });
		expect(parent.update).not.toHaveBeenCalled();
		expect(sibling.update).not.toHaveBeenCalled();
	});

	it('preserves an inherited owner and explicit page restrictions', async () => {
		const { page } = fixture({ default: -1, denied: 0 }, { default: 0, author: 3, denied: 3 });
		await grantTriggerVisibility(page as unknown as SplashPage);
		expect(page.update).toHaveBeenCalledWith({ ownership: { default: 2, author: 3, denied: 0 } });
	});

	it('leaves sufficient inherited ownership intact', async () => {
		const { page, parent } = fixture({ default: -1 }, { default: 3 });
		await grantTriggerVisibility(page as unknown as SplashPage);
		expect(page.update).not.toHaveBeenCalled();
		expect(parent.update).not.toHaveBeenCalled();
	});

	it('does not change permissions on a player client', async () => {
		vi.stubGlobal('game', { user: { isGM: false } });
		const { page, parent } = fixture();
		await grantTriggerVisibility(page as unknown as SplashPage);
		expect(page.update).not.toHaveBeenCalled();
		expect(parent.update).not.toHaveBeenCalled();
	});
});
