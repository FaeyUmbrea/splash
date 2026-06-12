import type { SplashAPI } from './api/api.js';
import type { SplashModel } from './datamodel/SplashModel.ts';

declare global {
	module '*.glsl' {
		const value: string;
		export default value;
	}

	interface ModuleConfig {
		splash: {
			api: SplashAPI;
		};
	}

	interface DataModelConfig {
		JournalEntryPage: {
			'splash.splash': SplashModel;
		};
	}
}

declare module 'fvtt-types/configuration' {
	namespace Hooks {
		interface HookConfig {
			'splash.init': () => void;
			'splash.active-changed': (active: { uuid: string; layer: string } | null) => void;
			'splash.presence-changed': () => void;
			'splash.votes-changed': (uuid: string, tallies: Record<string, { count: number; voters: string[] }>) => void;
			'splash.change-states': (action: ChangeStateAction) => void;
			'splash.close-splash': () => void;
			'splash.loading-state': (state: string) => void;
			'splash.loaded-state': (state: string) => void;
			'splash.unloading-state': (state: string) => void;
			'splash.unloaded-state': (state: string) => void;
			'splash.changed-states': (data: { load: string[]; unload: string[] }) => void;
		}
	}
}
