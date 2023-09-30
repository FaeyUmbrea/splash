import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";
import Splash from "../svelte/Splash.svelte";

export default class SplashApplication extends SvelteApplication {
  constructor(popover = false, args) {
    super(args);
    this.popover = popover;
  }

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

  async _render(force, options) {
    return await super._render(
      force,
      foundry.utils.mergeObject(options, {
        svelte: {
          props: {
            popover: this.popover,
          },
        },
      }),
    );
  }
}
