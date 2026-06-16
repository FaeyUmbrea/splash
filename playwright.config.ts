import { execSync } from 'node:child_process';
import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the Splash module, modelled on the obs-utils setup. Tests run against a live Foundry
 * world; the world is seeded once by `globalSetup` and tests must restore anything they change.
 *
 * Server selection: the :30001 dev server serves the module from `src/` live, so prefer it. If it is down,
 * fall back to :30000 (which serves the built `dist/`) after a forced `yarn build`. If neither is up, fail.
 * Override with TEST_URL.
 */
function isUp(url: string): boolean {
	try {
		const code = execSync(`curl -s -o /dev/null -w "%{http_code}" --max-time 2 ${url}/`, { encoding: 'utf8' }).trim();
		return code !== '' && code !== '000';
	} catch {
		return false;
	}
}

function resolveTestUrl(): string {
	if (process.env.TEST_URL) return process.env.TEST_URL;
	if (isUp('http://localhost:30001')) return 'http://localhost:30001';
	if (isUp('http://localhost:30000')) {
		console.warn('[splash e2e] :30001 unavailable; using :30000 (built dist). Building first…');
		execSync('yarn build', { stdio: 'inherit' });
		return 'http://localhost:30000';
	}
	throw new Error('[splash e2e] No Foundry server reachable on :30001 or :30000.');
}

const TEST_URL = resolveTestUrl();
process.env.TEST_URL = TEST_URL; // globalSetup reads the same resolved URL

export default defineConfig({
	testDir: './tests',
	globalSetup: './tests/globalSetup.ts',
	// Foundry is heavy and the canvas/WebGL takes a beat — be generous.
	timeout: 60 * 1000,
	expect: { timeout: 10 * 1000 },
	// Serial, single worker: every test shares one live world, so they must not run concurrently.
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [
		['list'],
		['html', { outputFolder: 'test-results/playwright-report', open: 'never' }],
	],
	outputDir: 'test-results/playwright',
	use: {
		baseURL: TEST_URL,
		actionTimeout: 0,
		trace: 'retain-on-failure',
		headless: true,
		// PIXI/WebGL needs a real GL backend even headless, or the splash canvas renders nothing.
		launchOptions: {
			args: [
				'--use-gl=angle',
				'--use-angle=default',
				'--enable-gpu',
				'--ignore-gpu-blocklist',
				'--enable-gpu-rasterization',
			],
		},
	},
	projects: [
		{
			name: 'Desktop Chromium',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
		},
	],
});
