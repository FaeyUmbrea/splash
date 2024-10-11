import { ID } from "./const.js";

export function registerKeybindings(): void {
  game?.keybindings?.register(ID, "close-splash", {
    editable: [{ key: "KeyQ", modifiers: ["Control"] }],
    restricted: false,
    name: "Close Splash",
    hint: "Closes Splash Overlay",
    onDown: (): void => {
      Hooks.callAll("splash.close-splash");
    },
  });
}
