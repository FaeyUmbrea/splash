import type {
	ActionInitialized,
	AnimationInitialized,
	SpriteInitialized,
	StateInitialized,
} from '../datamodel/SplashModel.ts';

/** Current runtime values, fed into text interpolation and condition checks. */
export type SplashValues = Record<string, unknown>;

/** Per-sprite wiring back into the owning runtime, so actions stay instance-scoped. */
export interface SpriteContext {
	onAction: (action: ActionInitialized) => Promise<void> | void;
}

/** A sprite instantiated by a renderer. Opaque to the runtime apart from these operations. */
export interface RenderedSprite {
	/** Move/resize the sprite to a new state. */
	transition: (state: StateInitialized) => void;
	/** Re-render value-bound content (e.g. `{key}` text interpolation). */
	updateValues: (values: SplashValues) => void;
	/** Remove the sprite from the stage and free its resources. */
	destroy: () => void;
}

/** Backend that turns splash data into something on screen (PIXI/WebGL, plain HTML, ...). */
export interface SplashRenderer {
	/** Preload any assets the given sprites need before first paint. */
	preload: (sprites: SpriteInitialized[]) => Promise<void>;
	/**
	 * Instantiate a sprite in the given state and add it to the stage,
	 * applying the entrance animation if one is given.
	 * Returns undefined for sprite types the renderer does not know.
	 */
	addSprite: (
		sprite: SpriteInitialized,
		state: StateInitialized,
		animIn: AnimationInitialized | null | undefined,
		context: SpriteContext,
	) => Promise<RenderedSprite | undefined>;
	/** Play an animation on an already-rendered sprite. No-op for unsupported animation types. */
	animate: (animation: AnimationInitialized, sprite: RenderedSprite) => Promise<void>;
	/**
	 * How long the renderer actually keeps the stage busy for an animation.
	 * Renderers that skip an animation must return 0 so the runtime does not block on it.
	 */
	animationDuration: (animation: AnimationInitialized | null | undefined) => number;
	/** Tear down the whole stage. */
	destroy: () => void;
}
