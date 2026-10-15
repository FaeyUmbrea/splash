import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test';
import { build, loadConfigFromFile } from 'vite';

test('rebuilding replaces old hashed chunks instead of retaining obsolete output', async (context) => {
	const directory = await mkdtemp(path.join(tmpdir(), 'splash-build-output-'));
	context.after(() => rm(directory, { recursive: true, force: true }));
	const source = path.join(directory, 'source');
	const output = path.join(directory, 'output');
	await mkdir(source);
	await writeFile(path.join(source, 'entry.js'), 'export const load = () => import("./chunk.js");\n');
	await writeFile(path.join(source, 'chunk.js'), 'export const value = "before";\n');
	const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, 'vite.config.ts');
	assert.ok(loaded);
	const config = {
		...loaded.config,
		configFile: false,
		logLevel: 'silent',
		// The report is unrelated to bundle cleanup and would write outside this fixture.
		plugins: loaded.config.plugins.filter(plugin => plugin?.name !== 'visualizer'),
		build: {
			...loaded.config.build,
			outDir: output,
			lib: { ...loaded.config.build.lib, entry: path.join(source, 'entry.js') },
		},
	};
	await build(config);
	const previous = (await readdir(output)).filter(file => file.startsWith('chunk-') && file.endsWith('.js'));
	assert.equal(previous.length, 1);
	await writeFile(path.join(source, 'chunk.js'), 'export const value = "after";\n');
	await build(config);
	const current = (await readdir(output)).filter(file => file.startsWith('chunk-') && file.endsWith('.js'));
	assert.equal(current.length, 1);
	assert.notEqual(current[0], previous[0]);
	await assert.rejects(access(path.join(output, previous[0])), { code: 'ENOENT' });
	assert.ok((await readFile(path.join(output, 'splash.js'), 'utf8')).includes(current[0]));
});
