import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

/** Apply edition metadata while preserving the VMM licence supplied with the distribution. */
export async function applyDistributionMetadata(channel, manifestPath, licensePath) {
	if (channel !== 'public' && channel !== 'premium') {
		throw new Error('RELEASE_CHANNEL must be either public or premium');
	}
	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
	if (!manifest.id || !manifest.title) throw new Error('The distribution manifest must declare an id and title');
	const license = await readFile(licensePath, 'utf8');
	if (!license.startsWith('# Void Monster Module Licence\n\nVersion 1.0.\n')) {
		throw new Error('The distribution must include the Void Monster Module Licence v1.0');
	}

	if (channel === 'premium') {
		manifest.id = `${manifest.id}-premium`;
		manifest.title = `${manifest.title} Premium`;
	}
	manifest.license = 'LICENSE';
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

/** Read the channel and staged file paths, then apply distribution metadata. */
async function main() {
	const [manifestPath, licensePath] = process.argv.slice(2);
	if (!manifestPath || !licensePath) {
		throw new Error('Usage: node tools/apply-distribution-metadata.mjs MANIFEST LICENSE');
	}
	await applyDistributionMetadata(process.env.RELEASE_CHANNEL ?? 'public', manifestPath, licensePath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
