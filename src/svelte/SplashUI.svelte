<svelte:options accessors="{true}" />

<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import { Splash } from "../types/splash.ts";
  import DissolveFilter, {
    type DissolveFilterProps,
  } from "../shaders/dissolve/dissolve.js";
  import { Image } from "../types/image.js";
  import { Button } from "../types/button.js";
  import type { Animation } from "../types/animation.js";
  import { TextSprite } from "../types/text.js";
  import NineSlicePlaneButton from "../pixi/nineSlicePlaneButton.js";
  import { State } from "../types/state.js";
  import { Sprite } from "../types/sprite.js";

  export let elementRoot: HTMLDivElement | undefined = void 0;

  export let popover;

  export let splashConfig: Splash = new Splash();

  let app: PIXI.Application;
  let view: HTMLCanvasElement;

  let loading = true;

  const instantiatedChildren: Map<string, PIXI.Sprite | NineSlicePlaneButton> =
    new Map();
  let loadedStates: string[] = [];

  onMount(async () => {
    app = new PIXI.Application({
      view,
      backgroundAlpha: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    app.stage.sortableChildren = true;
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
    for (const state of splashConfig.initialState) {
      await loadState(state);
    }
    loading = false;
  });

  let changingBlocked = false;

  function determineState(child: Sprite, statesToLoad: string[]) {
    let nextState;
    for (const stateId of statesToLoad) {
      const state = child.states.get(stateId);
      if (state) {
        if (!nextState) {
          nextState = state;
        }
        if (nextState?.priority < state.priority) {
          nextState = state;
        }
      }
    }
    return nextState;
  }

  async function loadChild(child: Sprite, state: State) {
    if (!state) return 0;
    const animation = state.animIn ?? child.animIn ?? splashConfig.animIn;
    const timeout = animation
      ? (animation.delay ?? 0) + (animation.duration ?? 3000)
      : 0;
    switch (child.type) {
      case "image": {
        await instantiateImage(child as Image, animation, state);
        break;
      }
      case "text": {
        await instantiateText(child as TextSprite, animation, state);
        break;
      }
      case "button": {
        await instantiateButton(child as Button, animation, state);
        break;
      }
    }
    return timeout;
  }

  async function loadState(stateId: string) {
    if (loadedStates.includes(stateId)) return;
    const children = splashConfig.getChildrenWithState(stateId);
    let longestTimeout = 0;
    if (children.length > 0) {
      for (let child of children) {
        const state = determineState(child, [stateId, ...loadedStates]);
        if (!state) continue;
        const instantiatedChild = instantiatedChildren.get(child.id);
        if (!instantiatedChild) {
          longestTimeout = Math.max(
            longestTimeout,
            await loadChild(child, state),
          );
        } else {
          transitionState(instantiatedChild, state);
        }
      }
    }
    loadedStates.push(stateId);
    return longestTimeout;
  }

  async function unloadState(stateId: string) {
    if (!loadedStates.includes(stateId)) return;
    let longestTimeout = 0;
    const children = splashConfig.getChildrenWithState(stateId)!;
    for (const child of children) {
      if (instantiatedChildren.has(child.id)) {
        const remainingStates = loadedStates.filter((c) => c !== stateId);
        const value = instantiatedChildren.get(child.id)!;
        if (remainingStates.some((c) => child.states.has(c))) {
          const state = determineState(child, remainingStates);
          if (!state) continue;
          transitionState(value, state);
        } else {
          const state = child.states.get(stateId)!;
          const animation =
            child.animOut ?? state.animOut ?? splashConfig.animOut;
          if (animation) {
            await instantiateAnimation(value, animation);
            const timeout =
              (animation.delay ?? 0) + (animation.duration ?? 3000);
            setTimeout(() => {
              value.destroy();
              app.stage.removeChild(value);
              instantiatedChildren.delete(child.id);
            }, timeout);
            longestTimeout = Math.max(longestTimeout, timeout);
          } else {
            value.destroy();
            app.stage.removeChild(value);
            instantiatedChildren.delete(child.id);
          }
        }
      }
    }
    loadedStates = loadedStates.filter((state) => state !== stateId);
    return longestTimeout;
  }

  function transitionState(
    child: PIXI.Sprite | NineSlicePlaneButton,
    state: State,
  ) {
    if (child instanceof NineSlicePlaneButton) {
      child.update({
        width: state.width ?? child.width,
        height: state.height ?? child.height,
      });
    } else {
      child.width = state.width ?? child.width;
      child.height = state.height ?? child.height;
    }
    child.position.set(state.x, state.y);
    child.zIndex = state.zIndex;
  }

  async function instantiateImage(
    image: Image,
    animation: Animation | undefined,
    state: State,
  ) {
    const sprite = PIXI.Sprite.from(image.img);
    transitionState(sprite, state);
    await instantiateAnimation(sprite, animation);
    app.stage.addChild(sprite);
    instantiatedChildren.set(image.id, sprite);
  }

  async function instantiateText(
    text: TextSprite,
    animation: Animation | undefined,
    state: State,
  ) {
    const sprite = new PIXI.Text(text.text, {
      fontFamily: text.font,
      fontSize: text.size,
      fill: text.fillColor,
      align: text.align,
    });
    transitionState(sprite, state);
    await instantiateAnimation(sprite, animation);
    app.stage.addChild(sprite);
    instantiatedChildren.set(text.id, sprite);
  }

  async function instantiateButton(
    button: Button,
    animation: Animation | undefined,
    state: State,
  ) {
    const buttonConfig = foundry.utils.mergeObject(button, {
      onTap: () => {
        switch (button.onClick.type) {
          case "macro":
            game.macros?.get(button.onClick.macroId)?.execute();
            break;
          case "change-state":
            Hooks.call("splash.change-states", button.onClick);
            break;
          case "close":
            Hooks.call("splash.close-splash");
            break;
        }
      },
    });
    const sprite = new NineSlicePlaneButton(buttonConfig);

    transitionState(sprite, state);

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

  const loadStateHook = Hooks.on(
    "splash.change-states",
    async ({ load, unload }: { load?: string[]; unload?: string[] }) => {
      if (changingBlocked) return;
      changingBlocked = true;
      let longestTimeout = 0;
      if (load) {
        for (const name of load) {
          Hooks.call("splash.loading-state", name);
          longestTimeout = Math.max(
            longestTimeout,
            (await loadState(name)) ?? 0,
          );
          Hooks.call("splash.loaded-state", name);
        }
      }
      if (unload) {
        for (const name of unload) {
          Hooks.call("splash.unloading-state", name);
          longestTimeout = Math.max(
            longestTimeout,
            (await unloadState(name)) ?? 0,
          );
          Hooks.call("splash.unloaded-state", name);
        }
      }
      if (longestTimeout > 0) {
        setTimeout(() => {
          changingBlocked = false;
          Hooks.call("splash.changed-states", { load, unload });
        }, longestTimeout);
      } else {
        changingBlocked = false;
        Hooks.call("splash.changed-states", { load, unload });
      }
    },
  );

  onDestroy(() => {
    app.stop();
    app.stage.destroy();
    Hooks.off("splash.close-splash", closeHook);
    Hooks.off("splash.change-states", loadStateHook);
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
