import type {
	AnimationInitialized,
	SpriteInitialized,
	StateInitialized,
} from '../datamodel/SplashModel.ts';

/** A sprite instantiated by a renderer. Opaque to the runtime apart from these operations. */
export interface RenderedSprite {
	/** Move/resize the sprite to a new state. */
	transition: (state: StateInitialized) => void;
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
		animIn?: AnimationInitialized | null,
	) => Promise<RenderedSprite | undefined>;
	/** Play an animation on an already-rendered sprite. No-op for unsupported animation types. */
	animate: (animation: AnimationInitialized, sprite: RenderedSprite) => Promise<void>;
	/** Tear down the whole stage. */
	destroy: () => void;
}
