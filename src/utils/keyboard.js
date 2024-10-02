import { ID } from "./const.js";

export function registerKeybindings() {
  game.keybindings.register(ID, "close-splash", {
    editable: [{ key: "KeyQ", modifiers: ["Control"] }],
    restricted: false,
    name: "Close Splash",
    hint: "Closes Splash Overlay",
    onDown: () => {
      Hooks.callAll("splash.close-splash");
    },
  });
}
