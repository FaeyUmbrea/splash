import type { SplashPage } from './launch.ts';
import { isSplashPage } from './launch.ts';

/** The default home for splashes. Found by name; created ONLY when a splash is made in it. */
export const DEFAULT_JOURNAL_NAME = 'Splashes and Handouts';

/** Every splash page across every journal, regardless of kind or location. */
export function allSplashPages(): SplashPage[] {
	return (game.journal?.contents ?? [])
		.flatMap(journal => journal.pages.contents)
		.filter(page => isSplashPage(page)) as SplashPage[];
}

/** The default journal, by name. Does NOT create it (lazy-create happens only on splash create). */
export function findDefaultJournal(): JournalEntry | undefined {
	return game.journal?.getName(DEFAULT_JOURNAL_NAME) ?? undefined;
}

/**
 * Create a new splash page. `journalId` null means the default journal — which is created here
 * if and only if it doesn't exist (the only place the default journal is ever auto-created).
 */
export async function createSplashPage(opts: { name: string; layer: string; journalId: string | null }): Promise<SplashPage | null> {
	let journal: JournalEntry | undefined | null;
	if (opts.journalId) {
		journal = game.journal?.get(opts.journalId);
	} else {
		journal = findDefaultJournal() ?? (await JournalEntry.create({ name: DEFAULT_JOURNAL_NAME }));
	}
	if (!journal) return null;

	const created = await journal.createEmbeddedDocuments('JournalEntryPage', [
		{ name: opts.name || 'New Splash', type: 'splash.splash', system: { layer: opts.layer } as never },
	]);
	return (created?.[0] ?? null) as SplashPage | null;
}
