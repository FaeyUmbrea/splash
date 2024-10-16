import { registerKeybindings } from "./utils/keyboard.js";
import { Splash } from "./types/splash.js";
import { Image } from "./types/image.js";
import { State } from "./types/state.js";
import { TextSprite } from "./types/text.js";
import SplashUI from "./svelte/SplashUI.svelte";
import { Button } from "./types/button.js";
import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";

export const img: string =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Delicious_apples.jpg/500px-Golden_Delicious_apples.jpg";

export const img2: string =
  "https://upload.wikimedia.org/wikipedia/commons/c/cc/Scan_of_an_orange.png";

declare global {
  interface Window {
    test: (popover: boolean) => void;
  }
}

window.test = (popover: boolean) => {
  const image: Image = new Image({
    img: img,
    name: "Image",
    states: new Map([
      [
        "initial",
        new State({
          zIndex: -1,
          priority: 1,
          height: window.innerHeight,
          width: window.innerWidth,
        }),
      ],
      [
        "third",
        new State({
          zIndex: -1,
          x: 700,
          y: 200,
          height: 200,
          width: 400,
        }),
      ],
    ]),
  });

  const text: TextSprite = new TextSprite({
    text: "Hello",
    font: "Arial",
    size: 20,
    fillColor: "#ffffff",
    states: new Map([["second", new State({ x: 500, y: 500, zIndex: 1 })]]),
  });

  const button: Button = new Button({
    label: {
      text: "Button",
      fontSize: 20,
      strokeThickness: 1,
      stroke: "#000000",
      fill: "#ffffff",
    },
    image: {
      url: img,
      leftWidth: 0,
      rightWidth: 0,
      topHeight: 0,
      bottomHeight: 0,
    },
    hoverImage: {
      url: img2,
      leftWidth: 0,
      rightWidth: 0,
      topHeight: 0,
      bottomHeight: 0,
    },
    clickLabel: {
      text: "SNENK",
      fontSize: 60,
      strokeThickness: 4,
      stroke: "#613414",
      fill: "#ba6234",
    },
    onClick: {
      type: "change-state",
      load: ["second"],
      unload: ["third"],
    },
    tint: "#cccccc",
    hoverTint: "#999999",
    clickTint: "#141241",
    states: new Map([
      [
        "third",
        new State({
          x: 500,
          y: 500,
        }),
      ],
    ]),
  });

  const splashConfig: Splash = new Splash({
    children: [image, text, button],
    states: new Map([
      ["initial", "Initial"],
      ["second", "Second"],
      ["third", "Third"],
    ]),
    animIn: {
      type: "dissolve",
      props: {
        randomOrigins: true,
        invert: true,
      },
    },
    animOut: {
      type: "dissolve",
      props: {
        randomOrigins: true,
        invert: false,
      },
    },
  });

  new SvelteApplication({
    classes: ["splash-overlay"],
    id: "splash-application",
    width: screen.width,
    height: screen.height,
    positionable: false,
    zIndex: 1,
    svelte: {
      //@ts-expect-error Typing issues in base class
      class: SplashUI,
      target: document.body,
      props: () => {
        return { splashConfig, popover };
      },
    },
    //@ts-expect-error The render method does not exist on the imported type, but does exist in the application
  }).render(true);
};

Hooks.once("init", () => {
  registerKeybindings();
});
