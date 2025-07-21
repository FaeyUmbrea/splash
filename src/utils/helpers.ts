import type { SplashInitialized, State } from '../datamodel/SplashModel.ts';
import NineSlicePlaneButton from '../pixi/nineSlicePlaneButton.js';

export function transitionState(child: PIXI.DisplayObject, state: State) {
	if (child instanceof NineSlicePlaneButton) {
		child.update({
			width: state.width ?? child.width,
			height: state.height ?? child.height,
		});
	} else if (child instanceof PIXI.Container) {
		child.width = state.width ?? child.width;
		child.height = state.height ?? child.height;
	}
	child.position.set(state.x ?? undefined, state.y ?? undefined);
	child.zIndex = state.zIndex ?? 0;
}

export function getChildrenWithState(splash: SplashInitialized, state: string) {
	return splash.children.filter(child => Object.keys(child.states).includes(state));
}
