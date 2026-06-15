import type { State } from '../datamodel/SplashModel.ts';
import NineSlicePlaneButton from './nineSlicePlaneButton.js';
import PanelGraphics from './panelGraphics.js';

/** Apply a state's position and dimensions to a PIXI display object. */
export function transitionState(child: PIXI.DisplayObject, state: State) {
	if (child instanceof NineSlicePlaneButton) {
		child.update({
			width: state.width ?? child.width,
			height: state.height ?? child.height,
		});
	} else if (child instanceof PanelGraphics) {
		child.resize(state.width ?? 200, state.height ?? 200);
	} else if (child instanceof PIXI.Text) {
		// Left natural: text auto-sizes to its glyphs and the HTML renderer sizes the wrapper, not the glyph.
	} else if (child instanceof PIXI.Container) {
		child.width = state.width ?? child.width;
		child.height = state.height ?? child.height;
	}
	child.position.set(state.x ?? undefined, state.y ?? undefined);
	child.zIndex = state.zIndex ?? 0;
	// Skew is stored in degrees (CSS-friendly); PIXI expects radians.
	const deg2rad = Math.PI / 180;
	child.skew.set((state.skewX ?? 0) * deg2rad, (state.skewY ?? 0) * deg2rad);
}
