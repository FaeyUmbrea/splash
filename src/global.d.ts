import type { Component } from 'svelte';
import type { SplashAPI } from './api/api.js';
import type { PresetModel } from './datamodel/PresetModel.ts';
import type { SplashModel } from './datamodel/SplashModel.ts';

declare global {
	module '*.glsl' {
		const value: string;
		export default value;
	}

	/** The slice of the optional OBS Utils API the splash compat layer uses. */
	interface ObsUtilsDirectorState {
		obsModeUserId: string | null;
		isInCombat: boolean;
		activeTrackingMode: string;
	}
	interface ObsUtilsApi {
		registerDirectorTab: (reg: { key: string; label: string; icon?: string; component: Component<{ disabled?: boolean }>; order?: number }) => void;
		getDirectorState: () => ObsUtilsDirectorState;
		isOBS: () => boolean;
	}

	interface ModuleConfig {
		'splash': {
			api: SplashAPI;
		};
		'obs-utils': {
			api: ObsUtilsApi;
		};
	}

	interface DataModelConfig {
		JournalEntryPage: {
			'splash.splash': SplashModel;
			'splash.preset': PresetModel;
		};
	}
}

declare module 'fvtt-types/configuration' {
	namespace Hooks {
		interface HookConfig {
			'splash.init': () => void;
			'obs-utils.init': () => void;
			'obs-utils.director.stateChanged': (next: ObsUtilsDirectorState, prev?: ObsUtilsDirectorState) => void;
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
