import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";
import Splash from "../svelte/Splash.svelte";

export default class SplashApplication extends SvelteApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["splash-overlay"],
      id: "splash-application",
      width: screen.width,
      height: screen.height,
      positionable: false,
      zIndex: 1,
      svelte: {
        class: Splash,
        target: document.body,
      },
    });
  }
}
