# Splash E2E tests

Real end-to-end tests (Playwright) that drive a **live Foundry world** in a headless browser — modelled on
the obs-utils setup. They cover what unit tests can't: actual rendering, two-client synced state, the door
trigger/indicator, and the launcher. Two genuine browser contexts (a Gamemaster and a Player) are used for
the GM↔player flows.

## Running

```bash
yarn test:e2e          # headless
yarn test:e2e:headed   # watch it drive the browser
```

The HTML report lands in `test-results/playwright-report/`.

Before the first run, install the matching headless browser with `yarn exec playwright install chromium --only-shell`. To keep it on an external drive, set `PLAYWRIGHT_BROWSERS_PATH` to the same external cache directory for both installation and test runs.

### Prerequisites

1. Foundry is running with the test world **active**, and the **`splash`** + **`lib-wrapper`** modules are
   enabled in it. The OBS Utils integration spec (`obs-compat.spec.ts`) additionally needs **`obs-utils`**
   enabled; it uses the three-context `obsTest` fixture (GM, an OBS client with `window.obsstudio` faked via
   `tests/initScripts/fakeobs.js`, and a player).
2. The suite talks to the dev server on **`http://localhost:30001`** by default (it serves the module from
   `src/`, so no build step is needed). Point it elsewhere with `TEST_URL`, e.g. the built module on the
   Foundry server: `TEST_URL=http://localhost:30000 yarn test:e2e`.
3. **No human may be logged in as `Gamemaster` while the suite runs** — Foundry only allows one session per
   user, and the tests need that one. (This is the main reason to use a dedicated test world, below.)

If a user password is set, pass it via `TEST_INSTALL_PASSWORD`.

## How it stays clean

- **`globalSetup.ts`** seeds the world's baseline once, **idempotently** (by name, so re-runs preserve existing documents):
  the `Player2`/`Player3` users, an `E2E Splashes` journal (a local fullscreen splash + a synced handout
  "lock"), and an `E2E Scene` with a door.
- **Each test restores anything it changes** in a `finally` block — closes overlays, clears the lock's
  `flags.splash.runtime`, unbinds doors. Re-running the suite back-to-back must stay green; failures can expose leaked state or nondeterministic synchronization. Existing fixture documents are not reset by setup.

## Existing test worlds and Foundry versions

Use the existing Splash test world for the Foundry version being checked. Keep its installed game system compatible with that Foundry version. Starting a server, switching systems and migrating worlds are separate operations; the browser suite does not do them. Do not clone Foundry installations or create replacement worlds to run these tests.

Run the release playback checks against the selected running world:

```bash
TEST_URL=http://localhost:30001 yarn test:e2e tests/release-playback.spec.ts
```

These checks cover a player's gated transition and fresh local playback in HTML and WebGL, plus player-controlled region entry and the initiating-client boundary. They create disposable documents in the existing world and remove them afterwards. Renderer settings, active/viewed scene, token vision and pause state are restored. WebGL actions use pointer coordinates relative to the rendered stage; canvas pixels are attached to the report for inspection, not asserted as a complete visual comparison.

Run the same tests on each claimed Foundry version. A successful server startup or compendium migration does not establish playback compatibility.

For storage-constrained machines, set `PLAYWRIGHT_BROWSERS_PATH` and `TMPDIR` to an external drive before installing browsers and running tests. Reuse an existing compatible browser installation where available.

## Writing a test

Use the `pages` fixture for the two clients and drive state through `page.evaluate(() => game…)`, asserting
cross-client propagation with `expect.poll`. **Always** undo world mutations in a `finally`:

```ts
test('…', async ({ pages: { gmPage } }) => {
	const uuid = await uuidOf(gmPage, 'E2E Lock');
	try {
		// … act on gmPage, assert on playerPage via expect.poll …
	} finally {
		await resetLock(gmPage, uuid); // restore the baseline
	}
});
```
