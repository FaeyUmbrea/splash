import { CURRENT_DATA_MODEL_VERSION, getDataModelVersion, setDataModelVersion } from './settings.ts';

/**
 * Lifts the stored data-model version to current. No persisted data exists yet (unreleased), so
 * per-document migrations gate on the stored version and run before the stamp once a release ships.
 */
export async function runDataModelMigrations(): Promise<void> {
	// Only the active GM writes the world setting, so the stamp runs once per world.
	if (game.users?.activeGM?.id !== game.userId) return;

	const stored = getDataModelVersion();
	if (stored >= CURRENT_DATA_MODEL_VERSION) return;

	// (post-release: run migrations for the `stored` → CURRENT delta here)

	await setDataModelVersion(CURRENT_DATA_MODEL_VERSION);
}
