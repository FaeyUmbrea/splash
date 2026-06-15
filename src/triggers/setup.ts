import { SplashAPI } from '../api/api.ts';
import { doorTrigger, registerDoorIndicator, registerDoorWrap } from './doorTrigger.ts';
import { regionTrigger, registerRegionBehavior } from './regionTrigger.ts';

/** Wire the first-party triggers through the public API (dogfooding), plus their Foundry hooks. */
export function setupTriggers(): void {
	registerRegionBehavior();
	registerDoorWrap();
	registerDoorIndicator();

	const api = SplashAPI.getInstance();
	api.registerTrigger('region', game.i18n.localize('splash.triggers.setup.regionLabel'), regionTrigger);
	api.registerTrigger('door', game.i18n.localize('splash.triggers.setup.doorLabel'), doorTrigger);
}
