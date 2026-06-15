import type { SplashInitialized } from '../datamodel/SplashModel.ts';

export function getChildrenWithState(splash: SplashInitialized, state: string) {
	return splash.children.filter(child => Object.keys(child.states).includes(state));
}
