import { CURRENT_DATA_MODEL_VERSION, getDataModelVersion, setDataModelVersion } from './settings.ts';

/**
 * Lifts the stored data-model version to current. Unreleased, so no per-document migrations exist yet;
 * they gate on the stored version and run before the stamp.
 */
export async function runDataModelMigrations(): Promise<void> {
	// Guard so only the active GM writes the world setting.
	if (game.users?.activeGM?.id !== game.userId) return;

	const stored = getDataModelVersion();
	if (stored >= CURRENT_DATA_MODEL_VERSION) return;

	// (post-release: run migrations for the `stored` → CURRENT delta here)

	await setDataModelVersion(CURRENT_DATA_MODEL_VERSION);
}
