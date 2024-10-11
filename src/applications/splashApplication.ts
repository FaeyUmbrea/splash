import {
  SvelteApplication,
  SvelteApplicationOptions,
} from "@typhonjs-fvtt/runtime/svelte/application";
import Splash from "../svelte/SplashUI.svelte";

export default class SplashApplication extends SvelteApplication {
  constructor(options: SvelteApplicationOptions) {
    super(options);
  }

  static get defaultOptions() {
    //@ts-expect-error Imported type does not correctly inherit Foundry Application
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
