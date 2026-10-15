import type { Component } from 'svelte';
import type { PresetModel } from './datamodel/PresetModel.ts';
import type { SplashModel } from './datamodel/SplashModel.ts';
import type { SplashApi } from './public-api.js';
import type { RuntimeSnapshot } from './renderer/SplashRuntime.ts';
import type { ActiveSplashSetting } from './utils/settings.ts';

declare global {
	/** Edition identifier replaced by Vite in both proxied development and production modules. */
	interface ImportMetaEnv {
		readonly SPLASH_MODULE_ID: 'splash' | 'splash-premium';
		readonly SPLASH_DOCUMENTATION_URL: string;
	}

	/** Vite metadata available to source modules without modifying Foundry's HTML. */
	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}

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
		registerDirectorTabSvelte5?: (reg: { key: string; label: string; icon?: string; order?: number; mount: (target: HTMLElement, props: { disabled: boolean }) => (() => void | Promise<void>) }) => void;
		registerDirectorTab: (reg: { key: string; label: string; icon?: string; component: Component<{ disabled?: boolean }>; order?: number }) => void;
		getDirectorState: () => ObsUtilsDirectorState;
		isOBS: () => boolean;
	}

}

declare module 'fvtt-types/configuration' {
	interface ModuleConfig {
		'splash': {
			api: SplashApi;
		};
		'splash-premium': {
			api: SplashApi;
		};
		'obs-utils': {
			api: ObsUtilsApi;
		};
		'obs-utils-premium': {
			api: ObsUtilsApi;
		};
	}

	/** Values stored by Splash's registered Foundry settings. */
	interface SettingConfig {
		'splash.renderer': 'auto' | 'html' | 'webgl';
		'splash.activeSplash': ActiveSplashSetting;
		'splash.spectatedUser': string;
		'splash.obsLastState': { uuid: string; snapshot: RuntimeSnapshot | null; mode: string } | null;
		'splash.dataModelVersion': number;
	}

	/** Runtime snapshots persisted on Splash journal pages. */
	interface FlagConfig {
		JournalEntryPage: { splash: { runtime?: RuntimeSnapshot } };
		Wall: { splash: { launchSplash?: string } };
	}

	interface DataModelConfig {
		JournalEntryPage: {
			'splash.splash': typeof SplashModel;
			'splash.preset': typeof PresetModel;
		};
	}

	namespace Hooks {
		interface HookConfig {
			'splash.init': () => void;
			'obs-utils.init': () => void;
			'obs-utils.director.stateChanged': (next: ObsUtilsDirectorState, prev?: ObsUtilsDirectorState) => void;
			'splash.active-changed': (active: { uuid: string; layer: string } | null) => void;
			'splash.spectated-changed': () => void;
			'splash.votes-changed': (uuid: string, tallies: Record<string, { count: number; voters: string[] }>) => void;
			'splash.change-states': (action: { load?: string[]; unload?: string[] }) => void;
			'splash.close-splash': (options?: { skipOutro?: boolean }) => void;
			'splash.peek-changed': (peeking: boolean) => void;
			'splash.unlock-door': (doorUuid?: string) => void;
			'splash.loading-state': (state: string) => void;
			'splash.loaded-state': (state: string) => void;
			'splash.unloading-state': (state: string) => void;
			'splash.unloaded-state': (state: string) => void;
			'splash.changed-states': (data: { load: string[]; unload: string[] }) => void;
		}
	}
}
