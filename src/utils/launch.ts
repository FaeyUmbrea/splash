/** Permission and discovery helpers for triggering splashes (GM + page owners). */

export type SplashPage = JournalEntryPage.OfType<'splash.splash'>;

export function isSplashPage(page: unknown): page is SplashPage {
	return (page as JournalEntryPage | undefined)?.type === 'splash.splash';
}

export function canTriggerSplash(page: SplashPage, user = game.user): boolean {
	if (!user) return false;
	return user.isGM || page.testUserPermission(user, 'OWNER');
}

/** Opening a handout for yourself only needs visibility, not trigger rights. */
export function canViewSplash(page: SplashPage, user = game.user): boolean {
	if (!user) return false;
	return user.isGM || page.testUserPermission(user, 'OBSERVER');
}

/** All splash pages the given user is allowed to trigger. */
export function listTriggerableSplashPages(user = game.user): SplashPage[] {
	return (game.journal?.contents ?? [])
		.flatMap(journal => journal.pages.contents)
		.filter(page => isSplashPage(page) && canTriggerSplash(page, user)) as SplashPage[];
}

/**
 * Raise a trigger-bound splash to OBSERVER so players can read it; Foundry delivers a blank shell otherwise.
 * Both the page AND its parent journal need it. Levels only rise, never clobbering a higher hand-tuned one.
 * Gotcha: raising the journal exposes sibling pages that inherit its default ownership, so keep
 * trigger-launched splashes in their own journal if siblings must stay hidden.
 */
export async function grantTriggerVisibility(page: SplashPage): Promise<void> {
	if (!game.user?.isGM) return;
	const { OBSERVER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;

	const pageDefault = page.ownership?.default ?? 0;
	if (pageDefault < OBSERVER) {
		await page.update({ ownership: { ...page.ownership, default: OBSERVER } });
	}

	const journal = page.parent as JournalEntry | undefined;
	const journalDefault = journal?.ownership?.default ?? 0;
	if (journal && journalDefault < OBSERVER) {
		await journal.update({ ownership: { ...journal.ownership, default: OBSERVER } });
	}
}
