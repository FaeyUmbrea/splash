# Splash: Interactive Handouts

Interactive fullscreen handouts for Foundry VTT — hide scene changes behind splash screens, build clickable puzzles, votes, and branching story screens.

## Development

```sh
yarn install
yarn build          # build into dist/
yarn dev            # vite dev server proxying a local Foundry on :30000
yarn lint           # eslint
yarn linkFoundry    # symlink this project into your Foundry data dir
```

Requires [lib-wrapper](https://github.com/ruipin/fvtt-lib-wrapper). Targets Foundry v13, maximum v14.

## License

AGPL-3.0-only
