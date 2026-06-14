import { CURRENT_DATA_MODEL_VERSION, getDataModelVersion, setDataModelVersion } from './settings.ts';

/**
 * Baseline version stamp. The module is unreleased, so there is no persisted data
 * to migrate — the only job here is to lift the stored data-model version from its
 * -1 sentinel to the current version. Future per-document migrations (added only
 * after a release ships) gate on the stored version and run before the stamp.
 */
export async function runDataModelMigrations(): Promise<void> {
	// Only the active GM writes the world setting, so the stamp runs once per world.
	if (game.users?.activeGM?.id !== game.userId) return;

	const stored = getDataModelVersion();
	if (stored >= CURRENT_DATA_MODEL_VERSION) return;

	// (post-release: run migrations for the `stored` → CURRENT delta here)

	await setDataModelVersion(CURRENT_DATA_MODEL_VERSION);
}
