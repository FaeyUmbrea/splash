import SplashApplication from "./applications/splashApplication.js";
import { registerKeybindings } from "./utils/keyboard.js";
import { Splash } from "./types/splash.js";
import { Image } from "./types/image.js";
import { State } from "./types/state.js";
import { TextSprite } from "./types/text.js";
import { Animation } from "./types/animation.js";

//Hooks.once("canvasReady", () => new SplashApplication().render(true));

export let img =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Delicious_apples.jpg/500px-Golden_Delicious_apples.jpg";

window.test = (popover) => {
  const image = new Image();
  image.x = 0;
  image.y = 0;
  image.width = window.innerWidth;
  image.height = window.innerHeight;
  image.img = img;
  image.id = "1";
  image.name = "Image";

  const text = new TextSprite();
  text.x = 500;
  text.y = 500;
  text.size = 20;
  text.text = "Hello";
  text.font = "Arial";
  text.fillColor = "#ffffff";
  text.id = "2";

  const initialState = new State();
  initialState.id = "initial";
  initialState.name = "Initial";
  initialState.children = ["1", "2"];

  const secondState = new State();
  secondState.id = "second";
  secondState.name = "Second";
  secondState.children = ["1"];

  const thirdState = new State();
  thirdState.id = "third";
  thirdState.name = "Third";
  thirdState.children = ["2"];

  const splashConfig = new Splash();
  splashConfig.title = "Splash Application";
  splashConfig.children = [image, text];
  splashConfig.states = [initialState, secondState, thirdState];
  splashConfig.initialState = "initial";
  splashConfig.animIn = new Animation();
  splashConfig.animIn.type = "dissolve";
  splashConfig.animIn.props = {
    randomOrigins: true,
    invert: true,
  };
  splashConfig.animOut = new Animation();
  splashConfig.animOut.type = "dissolve";
  splashConfig.animOut.props = {
    randomOrigins: true,
    invert: false,
  };

  new SplashApplication(popover, {
    svelte: {
      props: { splashConfig, popover },
    },
  }).render(true);
};

Hooks.once("init", () => {
  registerKeybindings();
});
