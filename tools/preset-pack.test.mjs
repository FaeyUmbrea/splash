import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test';
import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';

test('the shipped preset pack retains its behavior, stable references and compatible document metadata', async (context) => {
	const directory = await mkdtemp(path.join(tmpdir(), 'splash-preset-pack-'));
	context.after(() => rm(directory, { recursive: true, force: true }));
	const packed = path.join(directory, 'pack');
	const extracted = path.join(directory, 'extracted');
	await mkdir(extracted);
	await compilePack('src/packs/splash-presets', packed);
	await extractPack(packed, extracted, { documentType: 'JournalEntry' });
	const files = await readdir(extracted);
	assert.equal(files.length, 1);
	const journal = JSON.parse(await readFile(path.join(extracted, files[0]), 'utf8'));
	const manifest = JSON.parse(await readFile('module.json', 'utf8'));
	for (const document of [journal, ...journal.pages]) {
		const version = document._stats?.coreVersion;
		assert.ok(
			!version || version.localeCompare(manifest.compatibility.minimum, undefined, { numeric: true }) <= 0,
			`${document.name} requires Foundry ${version}, above the module's minimum ${manifest.compatibility.minimum}`,
		);
	}
	assert.equal(journal._id, 'splashPresetJrnl');
	const page = journal.pages[0];
	assert.equal(page._id, 'splashTumblerPg0');
	assert.equal(page.type, 'splash.preset');
	assert.equal(page.system.behavior, 'tumbler-lock');
	const sprites = page.system.payload.value;
	assert.equal(sprites.length, 25);
	assert.equal(new Set(sprites.map(sprite => sprite.id)).size, sprites.length);
	const groups = new Set(sprites.map(sprite => sprite.groupId).filter(Boolean));
	const unlock = sprites.find(sprite => sprite.name === 'Unlock');
	assert.ok(unlock);
	assert.equal(unlock.context.Wheels.length, 4);
	assert.ok(unlock.context.Wheels.every(group => groups.has(group)));
});
