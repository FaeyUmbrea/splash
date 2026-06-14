import { SplashAPI } from '../api/api.ts';
import { doorTrigger, registerDoorWrap } from './doorTrigger.ts';
import { regionTrigger, registerRegionBehavior } from './regionTrigger.ts';

/** Wire the first-party triggers through the public API (dogfooding), plus their Foundry hooks. */
export function setupTriggers(): void {
	registerRegionBehavior();
	registerDoorWrap();

	const api = SplashAPI.getInstance();
	api.registerTrigger('region', 'Token enters a region', regionTrigger);
	api.registerTrigger('door', 'Player clicks a locked door', doorTrigger);
}
