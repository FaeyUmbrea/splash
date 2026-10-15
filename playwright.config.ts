import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

/** Run against the selected existing Foundry session; tests never start servers or rebuild a fallback. */
const TEST_URL = process.env.TEST_URL ?? 'http://localhost:30001';
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
