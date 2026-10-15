import { readFile } from 'node:fs/promises';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { visualizer } from 'rollup-plugin-visualizer';

import { sveltePreprocess } from 'svelte-preprocess';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { configDefaults } from 'vitest/config';

import moduleJSON from './module.json' with { type: 'json' };

// ATTENTION!
// Please modify the below s_SVELTE_HASH_ID variable appropriately.

const releaseChannel = process.env.RELEASE_CHANNEL ?? 'public';
if (releaseChannel !== 'public' && releaseChannel !== 'premium') {
	throw new Error('RELEASE_CHANNEL must be either public or premium');
}
const moduleId = releaseChannel === 'premium' ? `${moduleJSON.id}-premium` : moduleJSON.id;
const s_PACKAGE_ID = `modules/${moduleId}`;
const documentationChannel = releaseChannel === 'premium' ? 'early-access' : 'public';
const documentationVersion = moduleJSON.version === '0.0.0' ? 'unreleased' : moduleJSON.version;
const documentationUrl = `https://docs.void.monster/splash/${documentationChannel}/${documentationVersion}/user/`;

// A short additional string to add to Svelte CSS hash values to make yours unique. This reduces the amount of
// duplicated framework CSS overlap between many TRL packages enabled on Foundry VTT at the same time. 'tst' is chosen
// by shortening 'template-svelte-ts'.
const s_SVELTE_HASH_ID = 'splsh';

const s_COMPRESS = true; // Set to true to compress the module bundle.
const s_SOURCEMAPS = true; // Generate sourcemaps for the bundle (recommended).

export default defineConfig(({ mode }) => {
	const compilerOptions = mode === 'production'
		? {
				cssHash: ({ hash, css }: { hash: (css: string) => string; css: string }) => `svelte-${s_SVELTE_HASH_ID}-${hash(css)}`,
			}
		// Foundry registers types once during init; component replacement can leave a new API singleton unregistered.
		: { hmr: false };

	return {
		root: 'src/', // Source location / esbuild root.
		base: `/${s_PACKAGE_ID}/dist`, // Base module path that 30001 / served dev directory.
		publicDir: false, // No public resources to copy.
		cacheDir: '../.vite-cache', // Relative from root directory.
		define: {
			'import.meta.env.SPLASH_MODULE_ID': JSON.stringify(moduleId),
			'import.meta.env.SPLASH_DOCUMENTATION_URL': JSON.stringify(documentationUrl),
		},

		resolve: {
			conditions: ['browser', 'import'],
		},

		test: {
			globals: true,
			environment: 'jsdom',
			exclude: [...configDefaults.exclude, 'tests/**'],
			coverage: {
				enabled: true,
				provider: 'istanbul',
				reporter: ['json'],
				exclude: ['node_modules/', 'tests/'],
				reportsDirectory: '../test-results/coverage/vitest',
			},
		},

		// About server options:
		// - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
		// debugger instance in your IDE and launch it with the URL: 'http://localhost:30001/game'.
		//
		// - The top proxy entry redirects requests under the module path for `style.css` and following standard static
		// directories: `assets` and `packs` and will pull those resources from the main Foundry / 30000 server.
		// This is necessary to reference the dev resources as the root is `/src` and there is no public / static
		// resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
		// static resources / project.
		server: {
			port: 30001,
			open: '/game',
			proxy: {
				// Serves static files from main Foundry server.
				[`^(/${s_PACKAGE_ID}/(assets|packs|storage|dist/${moduleJSON.id}.css))`]: 'http://localhost:30000',

				// All other paths besides package ID path are served from main Foundry server.
				[`^(?!/${s_PACKAGE_ID}/)`]: 'http://localhost:30000',

				// Rewrite incoming `module-id.js` request from Foundry to the dev server `index.ts`.
				[`/${s_PACKAGE_ID}/dist/${moduleJSON.id}.js`]: {
					target: `http://localhost:30001/${s_PACKAGE_ID}/dist`,
					rewrite: () => '/index.ts',
				},

				// Enable socket.io from main Foundry server.
				'/socket.io': { target: 'ws://localhost:30000', ws: true },
			},
		},
		build: {
			outDir: '../dist',
			emptyOutDir: true,
			sourcemap: s_SOURCEMAPS,
			brotliSize: true,
			minify: s_COMPRESS,
			target: ['esnext', 'chrome127'],
			lib: {
				entry: './index.ts',
				formats: ['es'],
				fileName: moduleJSON.id,
			},
			rollupOptions: {
				output: {
					// Rewrite the default style.css to a more recognizable file name.
					assetFileNames: assetInfo =>
						assetInfo.name === 'style.css' ? `${moduleJSON.id}.css` : assetInfo.name as string,
				},
			},
		},

		plugins: [
			{
				name: 'splash-development-translations',
				/** Serve this checkout's translations alongside its source during Foundry proxy development. */
				configureServer(server) {
					server.middlewares.use(async (request, response, next) => {
						const path = request.url?.split('?')[0];
						const language = moduleJSON.languages.find(language => path === `/${s_PACKAGE_ID}/${language.path}`);
						if (!language) return next();
						try {
							const content = await readFile(new URL(language.path, import.meta.url));
							response.setHeader('Content-Type', 'application/json');
							response.end(content);
						} catch (error) {
							next(error);
						}
					});
				},
			},
			svelte({
				compilerOptions,
				preprocess: sveltePreprocess(),
			}),
			glsl(),
			visualizer(),
		],
	};
});
