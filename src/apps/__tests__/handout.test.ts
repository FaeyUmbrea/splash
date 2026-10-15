import type { SplashPage } from '../../utils/launch.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeHandout, openHandout } from '../handout.ts';

const windows = vi.hoisted(() => new Map<string, { bringToFront: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }>());
vi.mock('../../svelte/SplashUI.svelte', () => ({ default: {} }));
vi.mock('../SvelteRenderer.ts', () => ({
	/** Register a window as Foundry does when render is called. */
	SvelteRenderer: class {
		bringToFront = vi.fn();
		close = vi.fn();
		constructor(_root: unknown, _props: unknown, readonly options: { id: string }) {}
		/** Expose this window to the same registry used for later focus and close requests. */
		render(): void { windows.set(this.options.id, this); }
	},
}));

/** Model two journal pages retaining the same embedded ID after native import. */
function page(journal: string): SplashPage {
	return { id: 'same-page', uuid: `JournalEntry.${journal}.JournalEntryPage.same-page`, name: journal, system: {} } as SplashPage;
}

beforeEach(() => {
	windows.clear();
	vi.stubGlobal('foundry', { applications: { instances: windows } });
});
afterEach(() => vi.unstubAllGlobals());

describe('imported handout windows', () => {
	it('opens source and imported pages separately while reusing each page’s own window', async () => {
		await openHandout(page('original'));
		await openHandout(page('imported'));
		expect(windows.size).toBe(2);
		const [original, imported] = [...windows.values()];
		await openHandout(page('original'));
		expect(original.bringToFront).toHaveBeenCalledOnce();
		expect(imported.bringToFront).not.toHaveBeenCalled();
	});

	it('closes only the requested copy', async () => {
		await openHandout(page('original'));
		await openHandout(page('imported'));
		const [original, imported] = [...windows.values()];
		await closeHandout(page('imported').uuid);
		expect(imported.close).toHaveBeenCalledOnce();
		expect(original.close).not.toHaveBeenCalled();
	});
});
