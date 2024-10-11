<svelte:options accessors="{true}" />

<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import { Splash } from "../types/splash.ts";
  import DissolveFilter, {
    type DissolveFilterProps,
  } from "../shaders/dissolve/dissolve.js";
  import { Image } from "../types/image.js";
  import { Button } from "../types/button.js";
  import { Animation } from "../types/animation.js";
  import { TextSprite } from "../types/text.js";
  import { State } from "../types/state.js";
  import NineSlicePlaneButton from "../pixi/nineSlicePlaneButton.js";

  export let elementRoot: HTMLDivElement | undefined = void 0;

  export let popover;

  export let splashConfig: Splash = new Splash();

  let app: PIXI.Application;
  let view: HTMLCanvasElement;

  let loading = true;

  const instantiatedChildren = new Map();

  onMount(async () => {
    app = new PIXI.Application({
      view,
      backgroundAlpha: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    app.ticker.maxFPS = game?.canvas?.app?.ticker?.maxFPS ?? 60;
    for (const c1 of splashConfig.children.filter((c) => c.type === "image")) {
      await PIXI.Assets.load((c1 as Image).img);
    }
    for (const c1 of splashConfig.children.filter((c) => c.type === "button")) {
      const image = (c1 as Button).image?.url;
      if (image) await PIXI.Assets.load(image);
      const hoverImage = (c1 as Button).hoverImage?.url;
      if (hoverImage) await PIXI.Assets.load(hoverImage);
      const clickImage = (c1 as Button).clickImage?.url;
      if (clickImage) await PIXI.Assets.load(clickImage);
    }
    await loadState(splashConfig.initialState);
    loading = false;
  });

  let loadingBlocked = false;

  async function loadState(stateId: string) {
    Hooks.callAll("splash.loading-state", stateId);
    if (loadingBlocked) return;
    const state: State | undefined = splashConfig.states.find(
      (s) => s.id === stateId,
    );
    if (state) {
      for (let childId of state.children) {
        if (!instantiatedChildren.has(childId)) {
          const child = splashConfig.children.find((c) => c.id === childId);
          if (child) {
            const animation =
              child.animIn ?? state.animIn ?? splashConfig.animIn;
            switch (child.type) {
              case "image": {
                await instantiateImage(child as Image, animation);
                break;
              }
              case "text": {
                await instantiateText(child as TextSprite, animation);
                break;
              }
              case "button": {
                await instantiateButton(child as Button, animation);
                break;
              }
            }
          }
        }
      }
      let longestTimeout = 0;
      for (const [key, value] of instantiatedChildren) {
        if (!state.children.includes(key)) {
          loadingBlocked = true;
          const animation =
            value.animOut ?? state.animOut ?? splashConfig.animOut;
          if (animation) {
            await instantiateAnimation(value, animation);
            const timeout =
              (animation.delay ?? 0) + (animation.duration ?? 3000);
            setTimeout(() => {
              value.destroy();
              app.stage.removeChild(value);
              instantiatedChildren.delete(key);
            }, timeout);
            longestTimeout = Math.max(longestTimeout, timeout);
          } else {
            value.destroy();
            app.stage.removeChild(value);
            instantiatedChildren.delete(key);
          }
        }
      }
      if (loadingBlocked) {
        setTimeout(() => {
          loadingBlocked = false;
          Hooks.callAll("splash.loaded-state", stateId);
        }, longestTimeout);
      } else {
        Hooks.callAll("splash.loaded-state", stateId);
      }
    }
  }

  async function instantiateImage(
    image: Image,
    animation: Animation | undefined,
  ) {
    const sprite = PIXI.Sprite.from(image.img);
    sprite.position.set(image.x ?? sprite.x, image.y ?? sprite.y);
    sprite.width = image.width ?? sprite.width;
    sprite.height = image.height ?? sprite.height;
    await instantiateAnimation(sprite, animation);
    app.stage.addChild(sprite);
    instantiatedChildren.set(image.id, sprite);
  }

  async function instantiateText(
    text: TextSprite,
    animation: Animation | undefined,
  ) {
    const sprite = new PIXI.Text(text.text, {
      fontFamily: text.font,
      fontSize: text.size,
      fill: text.fillColor,
      align: text.align,
    });
    sprite.position.set(text.x ?? sprite.x, text.y ?? sprite.y);
    sprite.width = text.width ?? sprite.width;
    sprite.height = text.height ?? sprite.height;
    await instantiateAnimation(sprite, animation);
    app.stage.addChild(sprite);
    instantiatedChildren.set(text.id, sprite);
  }

  async function instantiateButton(
    button: Button,
    animation: Animation | undefined,
  ) {
    const buttonConfig = foundry.utils.mergeObject(button, {
      onTap: () => {
        console.error("TAPPED");
      },
    });
    const sprite = new NineSlicePlaneButton(buttonConfig);
    sprite.position.set(button.x ?? sprite.x, button.y ?? sprite.y);

    await instantiateAnimation(sprite, animation);

    app.stage.addChild(sprite);
    instantiatedChildren.set(button.id, sprite);
  }

  async function instantiateAnimation(
    sprite: PIXI.Sprite | PIXI.NineSlicePlane,
    animation: Animation | undefined,
  ) {
    if (!animation) return;
    let animClass;
    switch (animation.type) {
      case "dissolve": {
        animClass = await DissolveFilter(
          app,
          animation.props as DissolveFilterProps,
        );
        break;
      }
      default:
        break;
    }
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

  let context: { application: Application } = getContext("#external");

  const closeHook = Hooks.on("splash.close-splash", () => {
    context.application.close();
  });

  const switchStateHook = Hooks.on("splash.switch-state", (name: string) => {
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
  {#if loading}
    <div class="loading"><span>Loading</span></div>
  {/if}
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
  
  .loading
    z-index -1
    color white
    position absolute
    width 100vw
    height 100vh
    background #00000050
    align-content center
    text-align center
    font-size 40px

</style>
