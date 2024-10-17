import { Animation } from "../types/animation.js";
import { Sprite } from "../types/sprite.js";
import { State } from "../types/state.js";
import { Action } from "../types/action.js";

/**
 * Accepts the definition of an animation type and a sprite object and initializes the requested animation on that sprite.
 */
export type AnimationBuilder = (
  sprite: PIXI.DisplayObject,
  animation: Animation,
  app: PIXI.Application,
) => Promise<void> | void;

export type SpriteBuilder = (
  Sprite: Sprite,
  state: State,
) => Promise<PIXI.DisplayObject> | PIXI.DisplayObject;

export type ActionProcessor = (action: Action) => Promise<void> | void;

/**
 *
 */
export class SplashAPI {
  private animations: Map<string, AnimationBuilder> = new Map();
  private animationNames: Map<string, string> = new Map();
  private sprites: Map<string, SpriteBuilder> = new Map();
  private spriteNames: Map<string, string> = new Map();
  private actions: Map<string, ActionProcessor> = new Map();
  private actionNames: Map<string, string> = new Map();

  public registerAnimation(
    type: string,
    name: string,
    builder: AnimationBuilder,
  ): void {
    this.animationNames.set(type, name);
    this.animations.set(type, builder);
  }

  public registerAction(
    type: string,
    name: string,
    processor: ActionProcessor,
  ): void {
    this.actions.set(type, processor);
    this.actionNames.set(type, name);
  }

  public registerSprite(
    type: string,
    name: string,
    builder: SpriteBuilder,
  ): void {
    this.sprites.set(type, builder);
    this.spriteNames.set(type, name);
  }

  public async buildAnimation(
    animation: Animation,
    sprite: PIXI.DisplayObject,
    app: PIXI.Application,
  ) {
    const builder = this.animations.get(animation.type);
    if (builder) {
      await builder(sprite, animation, app);
    } else {
      console.warn(
        `Splash | Animation Type ${animation.type} not found. Did not create.`,
      );
    }
  }

  public async processAction(action: Action): Promise<void> {
    const processor = this.actions.get(action.type);
    if (processor) {
      await processor(action);
    }
  }

  public async buildSprite(sprite: Sprite, state: State) {
    const builder = this.sprites.get(sprite.type);
    if (builder) {
      return builder(sprite, state);
    } else {
      console.warn(
        `Splash | Sprite type ${sprite.type} not found. Did not create.`,
      );
      return undefined;
    }
  }

  private static instance: SplashAPI | undefined;

  public static getInstance() {
    if (!this.instance) {
      this.instance = new SplashAPI();
    }
    return this.instance;
  }
}
