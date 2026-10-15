import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test';
import { applyDistributionMetadata } from './apply-distribution-metadata.mjs';

/** Stage a manifest and the project's VMM licence without changing source files. */
async function fixture() {
	const directory = await mkdtemp(path.join(tmpdir(), 'distribution-license-'));
	const manifestPath = path.join(directory, 'module.json');
	const licensePath = path.join(directory, 'LICENSE');
	await writeFile(manifestPath, `${JSON.stringify({
		id: 'test-module',
		title: 'Test Module',
		authors: [{ name: 'Test Author' }],
		license: 'LICENSE',
	}, null, 2)}\n`);
	const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
	await writeFile(licensePath, license);
	return { directory, manifestPath, licensePath, license };
}

test('preserves the VMM licence in public distributions', async (context) => {
	const files = await fixture();
	context.after(() => rm(files.directory, { force: true, recursive: true }));

	await applyDistributionMetadata('public', files.manifestPath, files.licensePath);

	assert.equal(await readFile(files.licensePath, 'utf8'), files.license);
	assert.deepEqual(JSON.parse(await readFile(files.manifestPath, 'utf8')), {
		id: 'test-module',
		title: 'Test Module',
		authors: [{ name: 'Test Author' }],
		license: 'LICENSE',
	});
});

test('preserves the same VMM licence in premium distributions', async (context) => {
	const files = await fixture();
	context.after(() => rm(files.directory, { force: true, recursive: true }));

	await applyDistributionMetadata('premium', files.manifestPath, files.licensePath);

	assert.deepEqual(JSON.parse(await readFile(files.manifestPath, 'utf8')), {
		id: 'test-module-premium',
		title: 'Test Module Premium',
		authors: [{ name: 'Test Author' }],
		license: 'LICENSE',
	});
	assert.equal(await readFile(files.licensePath, 'utf8'), files.license);
});

test('rejects a staged licence that is not VMM before changing the manifest', async (context) => {
	const files = await fixture();
	context.after(() => rm(files.directory, { force: true, recursive: true }));
	const manifest = await readFile(files.manifestPath, 'utf8');
	await writeFile(files.licensePath, 'All Rights Reserved\n');

	await assert.rejects(
		applyDistributionMetadata('premium', files.manifestPath, files.licensePath),
		/The distribution must include the Void Monster Module Licence v1.0/,
	);
	assert.equal(await readFile(files.manifestPath, 'utf8'), manifest);
});

test('rejects unknown release channels', async (context) => {
	const files = await fixture();
	context.after(() => rm(files.directory, { force: true, recursive: true }));

	await assert.rejects(
		applyDistributionMetadata('preview', files.manifestPath, files.licensePath),
		/RELEASE_CHANNEL must be either public or premium/,
	);
});
