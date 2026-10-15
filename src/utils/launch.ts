/** Permission and discovery helpers for triggering splashes (GM + page owners). */

/** A saved Splash page with the stable ID and UUID needed by editor, trigger and playback operations. */
export type SplashPage = JournalEntryPage.Stored<'splash.splash'>;

/** Accept only persisted Splash pages; temporary documents cannot be used for world-connected playback. */
export function isSplashPage(page: unknown): page is SplashPage {
	const document = page as JournalEntryPage | null | undefined;
	return document?.type === 'splash.splash' && typeof document.id === 'string' && typeof document.uuid === 'string';
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

/** Grant read access to the bound page while preserving parent/sibling permissions and inherited owners. */
export async function grantTriggerVisibility(page: SplashPage): Promise<void> {
	if (!game.user?.isGM) return;
	const { INHERIT, NONE, OBSERVER } = CONST.DOCUMENT_OWNERSHIP_LEVELS;
	const parentOwnership = page.parent?.ownership ?? {};
	const pageDefault = page.ownership.default ?? NONE;
	const effectiveDefault = pageDefault === INHERIT ? (parentOwnership.default ?? NONE) : pageDefault;
	if (effectiveDefault >= OBSERVER) return;

	const ownership = { ...page.ownership, default: OBSERVER };
	if (pageDefault === INHERIT) {
		// Replacing inheritance with Observer must retain higher per-user access from the parent.
		for (const [userId, level] of Object.entries(parentOwnership)) {
			if (userId !== 'default' && level > OBSERVER && page.ownership[userId] === undefined) ownership[userId] = level;
		}
	}
	await page.update({ ownership });
}
