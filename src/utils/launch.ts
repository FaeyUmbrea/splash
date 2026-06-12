/** Permission and discovery helpers for triggering splashes (GM + page owners). */

export type SplashPage = JournalEntryPage.OfType<'splash.splash'>;

export function isSplashPage(page: unknown): page is SplashPage {
	return (page as JournalEntryPage | undefined)?.type === 'splash.splash';
}

export function canTriggerSplash(page: SplashPage, user = game.user): boolean {
	if (!user) return false;
	return user.isGM || page.testUserPermission(user, 'OWNER');
}

/** All splash pages the given user is allowed to trigger. */
export function listTriggerableSplashPages(user = game.user): SplashPage[] {
	return (game.journal?.contents ?? [])
		.flatMap(journal => journal.pages.contents)
		.filter(page => isSplashPage(page) && canTriggerSplash(page, user)) as SplashPage[];
}
