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

### Prerequisites

1. Foundry is running with the test world **active**, and the **`splash`** + **`lib-wrapper`** modules are
   enabled in it.
2. The suite talks to the dev server on **`http://localhost:30001`** by default (it serves the module from
   `src/`, so no build step is needed). Point it elsewhere with `TEST_URL`, e.g. the built module on the
   Foundry server: `TEST_URL=http://localhost:30000 yarn test:e2e`.
3. **No human may be logged in as `Gamemaster` while the suite runs** — Foundry only allows one session per
   user, and the tests need that one. (This is the main reason to use a dedicated test world, below.)

If a user password is set, pass it via `TEST_INSTALL_PASSWORD`.

## How it stays clean

- **`globalSetup.ts`** seeds the world's baseline once, **idempotently** (by name, so re-runs are no-ops):
  the `Player2`/`Player3` users, an `E2E Splashes` journal (a local fullscreen splash + a synced handout
  "lock"), and an `E2E Scene` with a door.
- **Each test restores anything it changes** in a `finally` block — closes overlays, clears the lock's
  `flags.splash.runtime`, unbinds doors. The world is always left in the seeded state, so runs never poison
  one another. Re-running the suite back-to-back must stay green; if it doesn't, a test is leaking state.

## A dedicated test world (recommended)

Running against your day-to-day world clutters it and steals the `Gamemaster` seat. Make a dedicated one:

1. Log into any world, then use the in-world **Return to Setup** (the _world-overview_ "Go to Setup" button
   can't return you to setup without a setup password set, so use the in-world one).
2. On Setup, create a world (any system), enable **`splash`** + **`lib-wrapper`** in it, and launch it.
3. Run `yarn test:e2e` — `globalSetup` populates everything it needs; nothing else to set up.

## Checking a new Foundry version (e.g. v14)

The seed _is_ the world data, so there's nothing binary to copy: create a fresh world on the new version,
enable the two modules, and run the suite. Anything that regressed shows up as a failed test.

## Writing a test

Use the `pages` fixture for the two clients and drive state through `page.evaluate(() => game…)`, asserting
cross-client propagation with `expect.poll`. **Always** undo world mutations in a `finally`:

```ts
test('…', async ({ pages: { gmPage, playerPage } }) => {
	const uuid = await uuidOf(gmPage, 'E2E Lock');
	try {
		// … act on gmPage, assert on playerPage via expect.poll …
	} finally {
		await resetLock(gmPage, uuid); // restore the baseline
	}
});
```
