import NineSlicePlaneButton from "../pixi/nineSlicePlaneButton.js";
import { State } from "../types/state.js";

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
  child.position.set(state.x, state.y);
  child.zIndex = state.zIndex;
}
