import { SplashAPI } from './api/api.js';
import { registerControllerHooks } from './apps/controller.ts';

import { SplashModel } from './datamodel/SplashModel.js';
import { SplashSheet } from './sheet/SplashSheet.ts';
import { registerKeybindings } from './utils/keyboard.js';
import { listTriggerableSplashPages } from './utils/launch.ts';
import { registerSettings } from './utils/settings.ts';
import { setupAPI } from './utils/setup.js';
import { registerSocket } from './utils/socket.ts';
import './css/splash.scss';

export const img: string
	= 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Delicious_apples.jpg/500px-Golden_Delicious_apples.jpg';

export const img2: string
	= 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Scan_of_an_orange.png';

Hooks.once('init', () => {
	Object.assign(CONFIG.JournalEntryPage.dataModels, {
		'splash.splash': SplashModel,
	});

	foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'splash', SplashSheet, {
		types: ['splash.splash'],
		makeDefault: true,
	});

	registerKeybindings();
	registerSettings();
	registerSocket();
	registerControllerHooks();

	const api = SplashAPI.getInstance();

	const moduleData = (game as InitGame)?.modules?.get('splash');
	if (moduleData) {
		moduleData.api = api;
	}

	setupAPI(api);

	Hooks.call('splash.init');
});

Hooks.on('getSceneControlButtons', (controls) => {
	if (!game.user?.isGM && listTriggerableSplashPages().length === 0) return;
	const tool = {
		name: 'splashQuickAccess',
		icon: 'fa-solid fa-images',
		title: 'splash.quickAccess.title',
		toggle: true,
		onChange: async (_event: unknown, active: boolean) => {
			const { toggleQuickAccess } = await import('./apps/QuickAccessApplication.ts');
			await toggleQuickAccess(active, tool);
		},
	};
	// @ts-expect-error tool shape is narrower than SceneControls.Tool
	controls.tokens.tools.splashQuickAccess = tool;
});
