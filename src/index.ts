import SplashApplication from "./applications/splashApplication.js";
import { registerKeybindings } from "./utils/keyboard.js";
import { Splash } from "./types/splash.js";
import { Image } from "./types/image.js";
import { State } from "./types/state.js";
import { TextSprite } from "./types/text.js";
import { Animation } from "./types/animation.js";
import SplashUI from "./svelte/SplashUI.svelte";
import { Button } from "./types/button.js";

export const img: string =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Delicious_apples.jpg/500px-Golden_Delicious_apples.jpg";

declare global {
  interface Window {
    test: (popover: boolean) => void;
  }
}

window.test = (popover: boolean) => {
  const image: Image = new Image({
    img: img,
    name: "Image",
    height: window.innerHeight,
    width: window.innerWidth,
  });

  const text: TextSprite = new TextSprite({
    text: "Hello",
    font: "Arial",
    size: 20,
    fillColor: "#ffffff",
    x: 500,
    y: 500,
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
    onClick: "",
    x: 500,
    y: 500,
    tint: "#cccccc",
    hoverTint: "#999999",
    clickTint: "#000000",
  });

  const initialState: State = new State({
    children: [button.id],
  });

  const secondState: State = new State({
    id: "second",
    children: [image.id],
  });

  const thirdState: State = new State({
    id: "third",
    children: [text.id],
  });

  const splashConfig: Splash = new Splash({
    children: [image, text, button],
    states: [initialState, secondState, thirdState],
    animIn: new Animation({
      type: "dissolve",
      props: {
        randomOrigins: true,
        invert: true,
      },
    }),
    animOut: new Animation({
      type: "dissolve",
      props: {
        randomOrigins: true,
        invert: false,
      },
    }),
  });

  new SplashApplication({
    svelte: {
      //@ts-expect-error Typing issues in base class
      class: SplashUI,
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
