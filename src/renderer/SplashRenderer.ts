import type {
	ActionInitialized,
	AnimationInitialized,
	SpriteInitialized,
	StateInitialized,
} from '../datamodel/SplashModel.ts';

/** Runtime values fed into text interpolation and condition checks. */
export type SplashValues = Record<string, unknown>;

/** Ephemeral per-property overrides for one sprite (e.g. `{ text: 'A' }`). */
export type SpriteOverrides = Record<string, unknown>;

/** Per-sprite wiring back into the owning runtime. */
export interface SpriteContext {
	onAction: (action: ActionInitialized) => Promise<void> | void;
}

/** A sprite instantiated by a renderer. */
export interface RenderedSprite {
	transition: (state: StateInitialized) => void;
	updateValues: (values: SplashValues) => void;
	/** Apply ephemeral overrides; `{}` clears them. */
	applyOverrides: (overrides: SpriteOverrides) => void;
	destroy: () => void;
}

/** Backend that turns splash data into something on screen. */
export interface SplashRenderer {
	preload: (sprites: SpriteInitialized[]) => Promise<void>;
	/** Instantiate a sprite and add it to the stage. Returns undefined for unknown sprite types. */
	addSprite: (
		sprite: SpriteInitialized,
		state: StateInitialized,
		animIn: AnimationInitialized | null | undefined,
		context: SpriteContext,
	) => Promise<RenderedSprite | undefined>;
	/** Play an animation on a rendered sprite. No-op for unsupported animation types. */
	animate: (animation: AnimationInitialized, sprite: RenderedSprite) => Promise<void>;
	/** How long the renderer keeps the stage busy. Skipped animations must return 0 so the runtime does not block. */
	animationDuration: (animation: AnimationInitialized | null | undefined) => number;
	destroy: () => void;
}
