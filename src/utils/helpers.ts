import type { SplashInitialized } from '../datamodel/SplashModel.ts';

/** All sprites of a splash that participate in the given state. */
export function getChildrenWithState(splash: SplashInitialized, state: string) {
	return splash.children.filter(child => Object.keys(child.states).includes(state));
}
