# Changelog

## Version 1.1.0

### Added

- OBS Utils integration: a Director tab that mirrors a chosen player's or DM's live splash onto the stream — following their opens, closes, and state, for both local and synced splashes — plus a "Show on stream" action for handouts in the splash sheet and the manager. The stream client restores what it was showing after a reload.
- Shader effects pixelate, CRT curvature, and scanlines, usable as persistent effects and as transitions.
- More splash objects: gauges, hotspots, video, text inputs, and draggable pieces with drop zones for drag-and-drop puzzles.
- Editors render from the public registration API, so objects, effects, actions, and animations registered by other modules get the same editor UI as the built-ins.

## Version 1.0.0

### Added

- Initial release — interactive fullscreen splashes and windowed handouts for Foundry V13.
- Scene and HUD overlays that sit over the canvas, a full-screen takeover, and windowed handout apps.
- Visual editor with image, text, button, and panel objects across multiple states; drag-snap layout, grouping, and a collapsible object tree.
- Button actions (change state, set/increment value, vote, inline-macro script, close) with value-gated conditions for puzzles and combination locks.
- Synced mode — one shared runtime state for the whole table, driven by players through GM-proxied edits.
- Triggers that launch a splash when a player clicks a locked door or a token enters a region.
- WebGL renderer with shader effects (dissolve, glitch) and entrance/exit animations, plus a plain-HTML fallback for weak clients.
- Preset and prefab library shipped in a compendium, including a ready-made tumbler-lock combination puzzle.
- GM tools: a scene-control launcher, live peek/force-close controls, and door indicators for bound splashes.

## Version 0.0.0

- Template-based dev setup migration; Foundry v13 compatibility.
