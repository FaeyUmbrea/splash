<svelte:options accessors="{true}" />

<script>
  import { getContext, onDestroy, onMount } from "svelte";
  import { Splash } from "../types/splash.js";
  import DissolveFilter from "../shaders/dissolve/dissolve.js";

  export let elementRoot = void 0;

  export let popover;

  /**
   * @type {import("../types/splash.js").Splash}
   */
  export let splashConfig = new Splash();

  let app;
  let view;

  const instantiatedChildren = new Map();

  onMount(async () => {
    app = new PIXI.Application({
      view,
      backgroundAlpha: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    await loadState(splashConfig.initialState);
  });

  async function loadState(stateId) {
    /**
     * @type {import("../types/state.js").State}
     */
    const state = splashConfig.states.find((s) => s.id === stateId);
    if (state) {
      for (let childId of state.children) {
        if (!instantiatedChildren.has(childId)) {
          const child = splashConfig.children.find((c) => c.id === childId);
          if (child) {
            const animation =
              child.animIn ?? state.animIn ?? splashConfig.animIn;
            switch (child.type) {
              case "image": {
                await instantiateImage(child, animation);
                break;
              }
              case "text": {
                await instantiateText(child, animation);
                break;
              }
            }
          }
        }
      }
      for (const [key, value] of instantiatedChildren) {
        if (!state.children.includes(key)) {
          const animation =
            value.animOut ?? state.animOut ?? splashConfig.animOut;
          if (animation) {
            await instantiateAnimation(value, animation);
            setTimeout(
              () => {
                value.destroy();
                app.stage.removeChild(value);
                instantiatedChildren.delete(key);
              },
              (animation.delay ?? 0) + (animation.duration ?? 3000),
            );
          } else {
            value.destroy();
            app.stage.removeChild(value);
            instantiatedChildren.delete(key);
          }
        }
      }
    }
  }

  /**
   * @param {import("../types/image.js").Image} image
   * @param {import("../types/animation.js").Animation} animation
   */
  async function instantiateImage(image, animation) {
    const sprite = PIXI.Sprite.from(image.img);
    sprite.x = image.x;
    sprite.y = image.y;
    sprite.width = image.width;
    sprite.height = image.height;
    await instantiateAnimation(sprite, animation);
    app.stage.addChild(sprite);
    instantiatedChildren.set(image.id, sprite);
  }

  /**
   * @param {import("../types/text.js").TextSprite} text
   * @param {import("../types/animation.js").Animation} animation
   */
  async function instantiateText(text, animation) {
    const sprite = new PIXI.Text(text.text, {
      fontFamily: text.font,
      fontSize: text.size,
      fill: text.fillColor,
      align: text.align,
    });
    sprite.x = text.x ?? sprite.x;
    sprite.y = text.y ?? sprite.y;
    sprite.width = text.width ?? sprite.width;
    sprite.height = text.height ?? sprite.height;
    await instantiateAnimation(sprite, animation);
    app.stage.addChild(sprite);
    instantiatedChildren.set(text.id, sprite);
  }

  /**
   * @param sprite
   * @param {import("../types/animation.js").Animation} animation
   */
  async function instantiateAnimation(sprite, animation) {
    if (!animation) return;
    let animClass;
    switch (animation.type) {
      case "dissolve": {
        animClass = await DissolveFilter(
          app,
          animation.props.origins,
          animation.props.invert,
          animation.props.randomOrigins,
          animation.props.numOrigins,
        );
        break;
      }
      default:
        break;
    }
    if (animClass) {
      sprite.filters = [];
      setTimeout(() => {
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

  let context = getContext("#external");

  const closeHook = Hooks.on("splash.close-splash", () => {
    context.application.close();
  });

  const switchStateHook = Hooks.on("splash.switch-state", (name) => {
    loadState(name);
  });

  onDestroy(() => {
    app.stop();
    app.stage.destroy();
    Hooks.off("splash.close-splash", closeHook);
    Hooks.off("splash.switch-state", switchStateHook);
  });
</script>

<div class="{popover ? 'popover' : ''}" bind:this="{elementRoot}">
  <canvas bind:this="{view}"></canvas>
</div>

<style lang="stylus">
  div
    z-index 2
    position absolute
    width 100vw
    height 100vh
  .popover
    z-index 200
</style>
