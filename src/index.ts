import { SplashAPI } from './api/api.js';
import { registerControllerHooks } from './apps/controller.ts';
import { registerGmControls } from './apps/gmControls.ts';

import { registerBuiltinBehaviors } from './behaviors/index.ts';
import { PresetModel } from './datamodel/PresetModel.js';
import { SplashModel } from './datamodel/SplashModel.js';
import { PresetSheet } from './sheet/PresetSheet.ts';
import { SplashSheet } from './sheet/SplashSheet.ts';
import { setupTriggers } from './triggers/setup.ts';
import { registerKeybindings } from './utils/keyboard.js';
import { listTriggerableSplashPages } from './utils/launch.ts';
import { registerPresenceSocket } from './utils/presence.ts';
import { registerSettings } from './utils/settings.ts';
import { setupAPI } from './utils/setup.js';
import { registerSocket } from './utils/socket.ts';
import { registerSyncHooks, registerSyncSocket } from './utils/sync.ts';
import './css/splash.scss';

Hooks.once('init', () => {
	Object.assign(CONFIG.JournalEntryPage.dataModels, {
		'splash.splash': SplashModel,
		'splash.preset': PresetModel,
	});

	// The page-sheet action bar is a shared partial included by both view and edit templates.
	foundry.applications.handlebars.loadTemplates(['modules/splash/templates/splash-actions.hbs']);

	foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'splash', SplashSheet, {
		types: ['splash.splash'],
		makeDefault: true,
	});

	foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'splash', PresetSheet, {
		types: ['splash.preset'],
		makeDefault: true,
	});

	registerKeybindings();
	registerSettings();
	registerSocket();
	registerSyncSocket();
	registerSyncHooks();
	registerPresenceSocket();
	registerControllerHooks();
	registerGmControls();
	void registerBuiltinBehaviors();

	const api = SplashAPI.getInstance();

	const moduleData = (game as InitGame)?.modules?.get('splash');
	if (moduleData) {
		moduleData.api = api;
	}

	setupAPI(api);
	setupTriggers();

	Hooks.call('splash.init');
});

Hooks.once('ready', async () => {
	const { runDataModelMigrations } = await import('./utils/migration.ts');
	await runDataModelMigrations();
});

Hooks.on('getSceneControlButtons', (controls) => {
	if (!game.user?.isGM && listTriggerableSplashPages().length === 0) return;
	const tool = {
		name: 'splashLauncher',
		icon: 'fa-solid fa-images',
		title: 'splash.quickAccess.title',
		toggle: true,
		onChange: async (_event: unknown, active: boolean) => {
			const { toggleSceneLauncher } = await import('./apps/SceneLauncherApplication.ts');
			await toggleSceneLauncher(active, tool);
		},
	};
	// @ts-expect-error tool shape is narrower than SceneControls.Tool
	controls.tokens.tools.splashLauncher = tool;
});
