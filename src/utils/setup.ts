import { SplashAPI } from "../api/api.js";
import { Image } from "../types/image.js";
import type { Animation } from "../types/animation.js";
import { State } from "../types/state.js";
import { TextSprite } from "../types/text.js";
import { Button } from "../types/button.js";
import NineSlicePlaneButton from "../pixi/nineSlicePlaneButton.js";
import DissolveFilter, {
  type DissolveFilterProps,
} from "../shaders/dissolve/dissolve.js";
import { transitionState } from "./helpers.js";
import { Sprite } from "../types/sprite.js";
import { Action } from "../types/action.js";

export function setupAPI(api: SplashAPI) {
  api.registerAnimation("dissolve", "Dissolve Animation", instantiateDissolve);
  api.registerSprite("text", "Text", instantiateText);
  api.registerSprite("image", "Image", instantiateImage);
  api.registerSprite("button", "Button", instantiateButton);
  api.registerAction("macro", "Macro", executeMacro);
  api.registerAction("change-state", "Change State", changeState);
  api.registerAction("close", "Close Splash", closeSplash);
}

async function instantiateDissolve(
  sprite: PIXI.DisplayObject,
  animation: Animation,
  app: PIXI.Application,
) {
  const animClass = await DissolveFilter(
    app,
    animation.props as DissolveFilterProps,
  );

  if (animClass) {
    setTimeout(() => {
      if (!sprite.filters) {
        sprite.filters = [];
      }
      sprite.filters.push(animClass);
      setTimeout(() => {
        if (sprite.filters) {
          sprite.filters.splice(
            sprite.filters.findIndex((item) => item === animClass),
          );
        }
      }, animation.duration ?? 3000);
    }, animation.delay ?? 0);
  }
}

async function instantiateImage(child: Sprite, state: State) {
  if (child.type !== "image") throw new Error();
  const image = child as Image;
  const sprite = PIXI.Sprite.from(image.img);
  transitionState(sprite, state);
  return sprite;
}

async function instantiateText(child: Sprite, state: State) {
  if (child.type !== "text") throw new Error();
  const text = child as TextSprite;
  const sprite = new PIXI.Text(text.text, {
    fontFamily: text.font,
    fontSize: text.size,
    fill: text.fillColor,
    align: text.align,
  });
  transitionState(sprite, state);
  return sprite;
}

async function instantiateButton(child: Sprite, state: State) {
  if (child.type !== "button") throw new Error();
  const button = child as Button;
  const buttonConfig = foundry.utils.mergeObject(button, {
    onTap: async () => {
      await SplashAPI.getInstance().processAction(button.onClick);
    },
  });
  const sprite = new NineSlicePlaneButton(buttonConfig);

  transitionState(sprite, state);
  return sprite;
}

function executeMacro(action: Action) {
  if (action.type === "macro") {
    game.macros?.get(action.macroId)?.execute();
  }
}

function changeState(action: Action) {
  if (action.type === "change-state") {
    Hooks.call("splash.change-states", action);
  }
}

function closeSplash(action: Action) {
  if (action.type === "close") {
    Hooks.call("splash.close-splash");
  }
}
