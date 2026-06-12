import type { SplashInitialized } from '../../datamodel/SplashModel.ts';
import type { RenderedSprite, SplashRenderer } from '../SplashRenderer.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashRuntime } from '../SplashRuntime.ts';

function fakeRenderer() {
	const handles: Array<RenderedSprite & { transition: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }> = [];
	const renderer = {
		preload: vi.fn(async () => {}),
		addSprite: vi.fn(async () => {
			const handle = { transition: vi.fn(), destroy: vi.fn() };
			handles.push(handle);
			return handle;
		}),
		animate: vi.fn(async () => {}),
		animationDuration: vi.fn((animation?: { delay?: number; duration?: number } | null) =>
			animation ? (animation.delay ?? 0) + (animation.duration ?? 3000) : 0),
		destroy: vi.fn(),
	} satisfies SplashRenderer;
	return { renderer, handles };
}

function fixture(): SplashInitialized {
	return {
		initialState: ['initial'],
		states: { initial: 'Initial', second: 'Second', third: 'Third' },
		animIn: null,
		animOut: null,
		children: [
			{
				id: 'img-1',
				type: 'image',
				img: 'a.png',
				animIn: null,
				animOut: null,
				states: {
					initial: { priority: 1, x: 0, y: 0 },
					second: { priority: 5, x: 10, y: 10 },
				},
			},
			{
				id: 'txt-1',
				type: 'text',
				text: 'hi',
				animIn: null,
				animOut: { type: 'dissolve', delay: 100, duration: 400 },
				states: {
					second: { priority: 0, x: 5, y: 5 },
				},
			},
		],
	} as unknown as SplashInitialized;
}

describe('splashRuntime', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	it('initialize preloads assets and loads the initial states', async () => {
		const { renderer } = fakeRenderer();
		const runtime = new SplashRuntime(fixture(), renderer);
		await runtime.initialize();

		expect(renderer.preload).toHaveBeenCalledOnce();
		expect(renderer.addSprite).toHaveBeenCalledOnce();
		const [sprite, state] = renderer.addSprite.mock.calls[0];
		expect(sprite.id).toBe('img-1');
		expect(state).toEqual({ priority: 1, x: 0, y: 0 });
	});

	it('loading an already-loaded state is a no-op', async () => {
		const { renderer } = fakeRenderer();
		const runtime = new SplashRuntime(fixture(), renderer);
		await runtime.initialize();
		await runtime.loadState('initial');
		expect(renderer.addSprite).toHaveBeenCalledOnce();
	});

	it('loading a state transitions already-rendered sprites to the higher-priority state', async () => {
		const { renderer, handles } = fakeRenderer();
		const runtime = new SplashRuntime(fixture(), renderer);
		await runtime.initialize();
		await runtime.loadState('second');

		// img-1 already exists: transitioned to its priority-5 'second' state, not re-added.
		expect(handles[0].transition).toHaveBeenCalledWith({ priority: 5, x: 10, y: 10 });
		// txt-1 is new in 'second': added.
		expect(renderer.addSprite).toHaveBeenCalledTimes(2);
	});

	it('unloading a state destroys uncovered sprites immediately when they have no out-animation', async () => {
		const { renderer, handles } = fakeRenderer();
		const runtime = new SplashRuntime(fixture(), renderer);
		await runtime.initialize();
		await runtime.unloadState('initial');

		expect(handles[0].destroy).toHaveBeenCalledOnce();
		expect(renderer.animate).not.toHaveBeenCalled();
	});

	it('unloading a state keeps sprites that are covered by another loaded state', async () => {
		const { renderer, handles } = fakeRenderer();
		const runtime = new SplashRuntime(fixture(), renderer);
		await runtime.initialize();
		await runtime.loadState('second');
		await runtime.unloadState('second');

		// img-1 still has 'initial' loaded: transitioned back, not destroyed.
		expect(handles[0].destroy).not.toHaveBeenCalled();
		expect(handles[0].transition).toHaveBeenLastCalledWith({ priority: 1, x: 0, y: 0 });
	});

	it('unloading a state plays the out-animation and defers the destroy', async () => {
		const { renderer, handles } = fakeRenderer();
		const runtime = new SplashRuntime(fixture(), renderer);
		await runtime.initialize();
		await runtime.loadState('second');

		const timeout = await runtime.unloadState('second');
		// txt-1 leaves via its dissolve: delay 100 + duration 400.
		expect(timeout).toBe(500);
		expect(renderer.animate).toHaveBeenCalledOnce();
		const textHandle = handles[1];
		expect(textHandle.destroy).not.toHaveBeenCalled();
		vi.advanceTimersByTime(500);
		expect(textHandle.destroy).toHaveBeenCalledOnce();
	});

	it('changeStates emits lifecycle events and blocks re-entry until animations finish', async () => {
		const { renderer } = fakeRenderer();
		const events = vi.fn();
		const runtime = new SplashRuntime(fixture(), renderer, events);
		await runtime.initialize();

		await runtime.changeStates({ load: ['second'], unload: ['initial'] });
		expect(events.mock.calls.map(c => c[0])).toEqual([
			'splash.loading-state',
			'splash.loaded-state',
			'splash.unloading-state',
			'splash.unloaded-state',
			'splash.changed-states',
		]);

		// txt-1's out-animation is pending after unloading 'second': re-entry is ignored until it ends.
		await runtime.changeStates({ unload: ['second'] });
		const callsBefore = events.mock.calls.length;
		await runtime.changeStates({ load: ['third'] });
		expect(events.mock.calls.length).toBe(callsBefore);
		vi.advanceTimersByTime(500);
		expect(events).toHaveBeenLastCalledWith('splash.changed-states', { load: undefined, unload: ['second'] });
	});

	it('passes the most specific entrance animation to the renderer', async () => {
		const { renderer } = fakeRenderer();
		const splash = fixture();
		// @ts-expect-error plain test fixture
		splash.animIn = { type: 'dissolve', delay: 0, duration: 100 };
		// @ts-expect-error plain test fixture
		splash.children[0].states.initial.animIn = { type: 'fade', delay: 1, duration: 2 };
		const runtime = new SplashRuntime(splash, renderer);
		await runtime.initialize();

		const [, , animIn] = renderer.addSprite.mock.calls[0];
		expect(animIn).toEqual({ type: 'fade', delay: 1, duration: 2 });
	});

	it('never blocks state changes when the renderer skips animations', async () => {
		const { renderer, handles } = fakeRenderer();
		renderer.animationDuration.mockImplementation(() => 0);
		const events = vi.fn();
		const runtime = new SplashRuntime(fixture(), renderer, events);
		await runtime.initialize();
		await runtime.changeStates({ load: ['second'] });

		// txt-1 has an out-animation in the data, but the renderer reports zero duration:
		// the sprite is destroyed immediately and the next change is not swallowed.
		await runtime.changeStates({ unload: ['second'] });
		expect(handles[1].destroy).toHaveBeenCalledOnce();
		await runtime.changeStates({ unload: ['initial'] });
		expect(handles[0].destroy).toHaveBeenCalledOnce();
	});

	it('suppresses entrance animations only while restoring', async () => {
		const { renderer } = fakeRenderer();
		const splash = fixture();
		// @ts-expect-error plain test fixture
		splash.animIn = { type: 'dissolve', delay: 0, duration: 100 };
		const runtime = new SplashRuntime(splash, renderer);
		await runtime.initialize({ skipAnimations: true });

		// Restored sprite appears with no animation...
		expect(renderer.addSprite.mock.calls[0][2]).toBeNull();
		// ...but later state changes animate normally again.
		await runtime.loadState('second');
		expect(renderer.addSprite.mock.calls[1][2]).toEqual({ type: 'dissolve', delay: 0, duration: 100 });
	});

	it('destroy clears the stage via the renderer', async () => {
		const { renderer } = fakeRenderer();
		const runtime = new SplashRuntime(fixture(), renderer);
		await runtime.initialize();
		runtime.destroy();
		expect(renderer.destroy).toHaveBeenCalledOnce();
	});
});
