# Splash: Interactive Handouts

[![Latest Release Download Count](https://img.shields.io/github/downloads/FaeyUmbrea/splash/latest/module.zip)](https://github.com/FaeyUmbrea/splash/releases/latest) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fsplash&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=splash) [![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fsplash%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/splash/) [![Supported Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FFaeyUmbrea%2Fsplash%2Fmaster%2Fmodule.json)](https://github.com/FaeyUmbrea/splash/releases/latest)

[![Discord Banner](https://discord.com/api/guilds/1245779025931141292/widget.png?style=banner2)](https://discord.com/invite/WfMaKPPdeM)

Splash turns Foundry journal pages into interactive, fullscreen handouts: hide scene changes behind splash screens, build clickable puzzles, run table-wide votes, and branch between story screens — all from a visual editor, no code required.

## Concept

Splash is meant to be authored visually and to behave predictably. You lay objects out on a canvas, give them states and actions, and the runtime drives them the same way whether it renders through WebGL or plain DOM. First-party and third-party content register through the same API, so the editor never special-cases the built-ins.

## Usage

Create a journal page of type **Splash** and open the visual editor. Drop in objects — text, images, buttons, gauges, hotspots, draggable pieces, drop zones — then wire them with states and actions (set a value, change state, run a macro, cast a vote, run an inline script). Launch the result directly, from a scene region, or on door interaction.

## Features

- Visual, state-machine-driven editor — lay out objects, define per-state placement, preview live
- A full object set: text, image, button, panel, gauge, video, hotspot, text input, draggable pieces, drop zones
- Actions: set/increment runtime values, change state (with conditions), run a Macro, inline scripts, table-wide votes, close
- Triggers: launch from a scene region or a door, fire from a macro, or pin to scenes
- Transitions: dissolve, glitch, and pixelate animate objects in and out
- WebGL effects: glitch, pixelate, CRT curvature, and scanlines, built from composable shared shader blocks
- Layers: fullscreen (scene / hud / full) or a windowed handout
- Local or synced playback, with GM-driven shared state and live vote tallies
- Renderer-agnostic runtime (WebGL or DOM) with graceful degradation
- OBS Utils aware: spectator clients mirror handout state
- Reusable presets

## Requirements

- [lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper)

Targets Foundry VTT v13, maximum v14.

## Contributing

### Translation

Splash currently ships English only. Translations are welcome — open a PR adding a `lang/<code>.json` and registering it in `module.json`.

## Building

Only Node.js and Yarn are required.

### Dependencies

| Project     | Version |
| ----------- | ------- |
| nodejs.org  | ^20.0.0 |
| yarnpkg.com | ^4.0.0  |

## Tasks

### setup

Install dependencies.

```
yarn install
```

### build

Build the module into `dist/`.

```
yarn build
```

### dev

Run the Vite dev server, proxying a local Foundry on `:30000`.

```
yarn dev
```

### test

Run the unit and end-to-end suites.

```
yarn test:unit
yarn test:e2e
```

### link

Symlink the project into your Foundry data directory.

```
yarn linkFoundry
```

## License

AGPL-3.0-only
