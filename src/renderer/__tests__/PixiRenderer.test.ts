// @vitest-environment jsdom
import type { SpriteInitialized, StateInitialized } from '../../datamodel/SplashModel.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PixiRenderer } from '../PixiRenderer.ts';

const api = vi.hoisted(() => ({
	buildSprite: vi.fn(),
	buildAnimation: vi.fn(),
	buildEffect: vi.fn(),
}));

vi.mock('../../api/api.ts', () => ({ SplashAPI: { getInstance: () => api } }));
vi.mock('../../pixi/transitionState.ts', () => ({ transitionState: vi.fn() }));

/** Hold an asynchronous builder open until the test closes its renderer. */
function pending<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

/** Own a stage and display object without allocating a WebGL context. */
function fixture() {
	const objects = new Set<object>();
	const stage = {
		sortableChildren: false,
		addChild: vi.fn((object: object) => objects.add(object)),
		removeChild: vi.fn((object: object) => objects.delete(object)),
	};
	const object = {
		text: '',
		destroyed: false,
		filters: null,
		/** Match PIXI's ownership contract: detach a display object before destroying it. */
		destroy: vi.fn(() => {
			expect(objects.has(object)).toBe(false);
			object.destroyed = true;
		}),
	};
	const app = {
		stage,
		ticker: { maxFPS: 0 },
		renderer: { resize: vi.fn() },
		/** Dispose stage children as PIXI.Application does during playback teardown. */
		destroy: vi.fn(() => {
			for (const child of objects) {
				stage.removeChild(child);
				(child as typeof object).destroy();
			}
		}),
	};
	const disconnect = vi.fn();
	vi.stubGlobal('PIXI', {
		Application: class {
			constructor() {
				return app;
			}
		},
		Assets: { load: vi.fn() },
	});
	vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); disconnect = disconnect; });
	vi.stubGlobal('game', { canvas: { app: { ticker: { maxFPS: 60 } } } });
	const host = document.createElement('div');
	const view = host.appendChild(document.createElement('canvas'));
	api.buildSprite.mockResolvedValue(object);
	return { renderer: new PixiRenderer(view), object, app, disconnect };
}

/** Text configuration shared by interpolation and pending-construction cases. */
const text = { type: 'text', text: 'Code: {code}', effects: [] } as unknown as SpriteInitialized;
/** Default initialized placement; geometry itself is covered by transitionState's tests. */
const state: StateInitialized = { priority: 0, name: '', x: 0, y: 0, zIndex: 0, width: null, height: null, skewX: 0, skewY: 0, animIn: undefined, animOut: undefined };
const context = { onAction: vi.fn() };

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('pixi playback ownership', () => {
	it('keeps complete interpolated labels through updates, overrides and override removal', async () => {
		const { renderer, object } = fixture();
		const handle = await renderer.addSprite(text, state, null, context);
		for (const code of [1, 2, 9, 10, 11]) {
			handle!.updateValues({ code });
			expect(object.text).toBe(`Code: ${code}`);
		}
		handle!.applyOverrides({ text: 'Unlocked' });
		handle!.updateValues({ code: 12 });
		expect(object.text).toBe('Unlocked');
		handle!.applyOverrides({});
		expect(object.text).toBe('Code: 12');
		renderer.destroy();
	});

	it('disposes a sprite whose builder finishes after its playback closes', async () => {
		const { renderer, object, app, disconnect } = fixture();
		const builder = pending<typeof object>();
		api.buildSprite.mockReturnValue(builder.promise);
		const adding = renderer.addSprite(text, state, null, context);
		renderer.destroy();
		builder.resolve(object);
		expect(await adding).toBeUndefined();
		expect(object.destroy).toHaveBeenCalledOnce();
		expect(app.stage.addChild).not.toHaveBeenCalled();
		expect(disconnect).toHaveBeenCalledOnce();
	});

	it('does not start effects or attach a sprite after its pending entrance finishes on a closed playback', async () => {
		const { renderer, object, app } = fixture();
		const animation = pending<void>();
		api.buildAnimation.mockReturnValue(animation.promise);
		const animated = { ...text, effects: [{ type: 'blur' }] } as unknown as SpriteInitialized;
		const adding = renderer.addSprite(animated, state, { type: 'dissolve', duration: 300, delay: 0, props: { type: 'fixedOrigins', origins: [] } }, context);
		await vi.waitFor(() => expect(api.buildAnimation).toHaveBeenCalledOnce());
		renderer.destroy();
		animation.resolve();
		expect(await adding).toBeUndefined();
		expect(api.buildEffect).not.toHaveBeenCalled();
		expect(app.stage.addChild).not.toHaveBeenCalled();
		expect(object.destroy).toHaveBeenCalledOnce();
	});

	it('can remove one sprite and subsequently close its playback without destroying it twice', async () => {
		const { renderer, object, app } = fixture();
		const handle = await renderer.addSprite(text, state, null, context);
		handle!.destroy();
		handle!.destroy();
		renderer.destroy();
		renderer.destroy();
		expect(object.destroy).toHaveBeenCalledOnce();
		expect(app.stage.removeChild).toHaveBeenCalledOnce();
		expect(app.destroy).toHaveBeenCalledOnce();
	});

	it('stops loading remaining assets when the owner closes during a preload', async () => {
		const { renderer } = fixture();
		const loading = pending<Record<string, unknown>>();
		vi.mocked(PIXI.Assets.load).mockReturnValueOnce(loading.promise);
		const preloading = renderer.preload([
			{ type: 'image', img: 'first.webp' },
			{ type: 'image', img: 'second.webp' },
		] as SpriteInitialized[]);
		renderer.destroy();
		loading.resolve({});
		await preloading;
		expect(PIXI.Assets.load).toHaveBeenCalledExactlyOnceWith('first.webp');
		expect(await renderer.addSprite(text, state, null, context)).toBeUndefined();
		expect(api.buildSprite).not.toHaveBeenCalled();
	});
});
