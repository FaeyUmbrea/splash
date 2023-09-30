import SplashApplication from "./applications/splashApplication.js";

//Hooks.once("canvasReady", () => new SplashApplication().render(true));

window.test = (popover) => new SplashApplication(popover).render(true);
