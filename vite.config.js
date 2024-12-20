import { svelte } from "@sveltejs/vite-plugin-svelte";
import { postcssConfig, terserConfig } from "@typhonjs-fvtt/runtime/rollup";
import { visualizer } from "rollup-plugin-visualizer";
import { transform } from "esbuild";
import glsl from "vite-plugin-glsl";

// ATTENTION!
// Please modify the below variables: s_PACKAGE_ID and s_SVELTE_HASH_ID appropriately.

// For convenience, you just need to modify the package ID below as it is used to fill in default proxy settings for
// the dev server.
const s_PACKAGE_ID = "modules/splash";

const s_TERSER = false; // Set to true to use terser
const s_SOURCEMAPS = true; // Generate sourcemaps for the bundle (recommended).
const s_MINIFY = true; // Set to true to compress the module bundle.
const s_TYPESCRIPT = true; // Set to true if using index.ts instead of index.js

// Used in bundling particularly during development. If you npm-link packages to your project add them here.
/*const s_RESOLVE_CONFIG = {
  browser: true,
  dedupe: ['svelte'],
};*/

export default () =>
  /** @type {import('vite').UserConfig} */
  ({
    root: "src/", // Source location / esbuild root.
    base: `/${s_PACKAGE_ID}/`, // Base module path that 30001 / served dev directory.
    publicDir: "../public", // No public resources to copy.
    cacheDir: "../.vite-cache", // Relative from root directory.

    resolve: { conditions: ["import", "browser"] },

    esbuild: {
      target: ["es2022"],
    },

    css: {
      // Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
      postcss: postcssConfig({ compress: s_TERSER, sourceMap: s_SOURCEMAPS }),
    },

    // About server options:
    // - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
    // debugger instance in your IDE and launch it with the URL: 'http://localhost:30001/game'.
    //
    // - The top proxy entry redirects requests under the module path for `style.css` and following standard static
    // directories: `assets`, `lang`, and `packs` and will pull those resources from the main Foundry / 30000 server.
    // This is necessary to reference the dev resources as the root is `/src` and there is no public / static
    // resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
    // static resources / project.
    server: {
      port: 30001,
      open: "/game",
      proxy: {
        // Serves static files from main Foundry server.
        [`^(/${s_PACKAGE_ID}/(assets|lang|packs|style.css))`]:
          "http://localhost:30000",

        // All other paths besides package ID path are served from main Foundry server.
        [`^(?!/${s_PACKAGE_ID}/)`]: "http://localhost:30000",

        // Enable socket.io from main Foundry server.
        "/socket.io": { target: "ws://localhost:30000", ws: true },
      },
    },
    build: {
      outDir: "../dist",
      emptyOutDir: false,
      sourcemap: s_SOURCEMAPS,
      brotliSize: true,
      minify: s_TERSER ? "terser" : "esbuild",
      target: ["es2022"],
      terserOptions: s_TERSER ? { ...terserConfig(), ecma: 2022 } : void 0,
      lib: {
        entry: "./index",
        formats: ["es"],
        fileName: `index`,
      },
    },

    plugins: [
      glsl(),
      svelte({
        configFile: "../svelte.config.js",
      }),

      //resolve(s_RESOLVE_CONFIG), // Necessary when bundling npm-linked packages.

      minifyEs(),
      ReplaceJS,
      visualizer({
        sourcemap: true,
      }),
    ],
  });

function minifyEs() {
  return {
    name: "minifyEs",
    renderChunk: {
      order: "post",
      async handler(code) {
        if (s_MINIFY) {
          return await transform(code, {
            minify: true,
            sourcemap: s_SOURCEMAPS,
          });
        }
        return code;
      },
    },
  };
}

const ReplaceJS = {
  name: "replace-js-plugin",
  configureServer(server) {
    server.middlewares.use(`/${s_PACKAGE_ID}/`, (req, res, next) => {
      if (req.url === "/index.js" && s_TYPESCRIPT) req.url = "/index.ts";
      next();
    });
  },
};
