import type { SplashStateData } from '../public-api.ts';
import GaugeGraphics from './gaugeGraphics.js';
import NineSlicePlaneButton from './nineSlicePlaneButton.js';
import PanelGraphics from './panelGraphics.js';

/** Apply a state's position and dimensions to a PIXI display object. */
export function transitionState(child: PIXI.DisplayObject, state: SplashStateData) {
	let x = state.x ?? 0;
	if (child instanceof NineSlicePlaneButton) {
		child.update({
			width: state.width ?? child.width,
			height: state.height ?? child.height,
		});
	} else if (child instanceof PanelGraphics) {
		child.resize(state.width ?? 200, state.height ?? 200);
	} else if (child instanceof GaugeGraphics) {
		child.resize(state.width ?? 300, state.height ?? 40);
	} else if (child instanceof PIXI.Text) {
		// Anchor natural glyph bounds inside the placement width, including after dynamic text changes.
		let align = 0;
		if (state.width != null) {
			if (child.style.align === 'center') align = 0.5;
			else if (child.style.align === 'right') align = 1;
		}
		child.anchor.set(align, 0);
		x += (state.width ?? 0) * align;
	} else if (child instanceof PIXI.Container) {
		child.width = state.width ?? child.width;
		child.height = state.height ?? child.height;
	}
	child.position.set(x, state.y ?? 0);
	child.zIndex = state.zIndex ?? 0;
	// Skew is stored in degrees, PIXI expects radians.
	const deg2rad = Math.PI / 180;
	child.skew.set((state.skewX ?? 0) * deg2rad, (state.skewY ?? 0) * deg2rad);
}
