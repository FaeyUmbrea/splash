import { SplashAPI } from './api/api.js';

import { SplashModel } from './datamodel/SplashModel.js';
import { SplashSheet } from './sheet/SplashSheet.ts';
import { registerKeybindings } from './utils/keyboard.js';
import { registerSettings } from './utils/settings.ts';
import { setupAPI } from './utils/setup.js';
import './css/splash.scss';

export const img: string
	= 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Delicious_apples.jpg/500px-Golden_Delicious_apples.jpg';

export const img2: string
	= 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Scan_of_an_orange.png';

declare global {
	interface Window {
		test: (popover: boolean) => void;
	}
}

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

	const api = SplashAPI.getInstance();

	const moduleData = (game as InitGame)?.modules?.get('splash');
	if (moduleData) {
		moduleData.api = api;
	}

	setupAPI(api);

	Hooks.call('splash.init');
});
