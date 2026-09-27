const OBS_UTILS_IDS = ['obs-utils-premium', 'obs-utils'] as const;

export function getObsUtilsModule() {
	const modules = game.modules;
	if (!modules) return undefined;
	const candidates = OBS_UTILS_IDS.map(id => modules.get(id));
	return candidates.find(module => module?.active) ?? candidates.find(module => module !== undefined);
}
