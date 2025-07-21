import type {
	ActionInitialized as Action,
	AnimationInitialized as Animation,
	SpriteInitialized as Sprite,
	StateInitialized as State,
} from '../datamodel/SplashModel.ts';

/**
 * Accepts the definition of an animation type and a sprite object and initializes the requested animation on that sprite.
 */
export type AnimationBuilder<A extends Animation> = (
	animation: A,
	sprite: PIXI.DisplayObject,
	app: PIXI.Application,
) => Promise<void> | void;

export type SpriteBuilder<S extends Sprite> = (
	Sprite: S,
	state: State,
) => Promise<PIXI.DisplayObject> | PIXI.DisplayObject;

export type ActionProcessor<A extends Action> = (
	action: A,
) => Promise<void> | void;

/**
 *
 */
export class SplashAPI {
	private animations: Map<string, AnimationBuilder<Animation>> = new Map();
	private animationNames: Map<string, string> = new Map();
	private sprites: Map<string, SpriteBuilder<Sprite>> = new Map();
	private spriteNames: Map<string, string> = new Map();
	private actions: Map<string, ActionProcessor<Action>> = new Map();
	private actionNames: Map<string, string> = new Map();

	public registerAnimation<A extends Animation>(
		type: A['type'],
		name: string,
		builder: AnimationBuilder<A>,
	): void {
		this.animationNames.set(type, name);
		this.animations.set(type, builder as AnimationBuilder<Animation>);
	}

	public registerAction<A extends Action>(
		type: A['type'],
		name: string,
		processor: ActionProcessor<A>,
	): void {
		this.actions.set(type, processor as ActionProcessor<Action>);
		this.actionNames.set(type, name);
	}

	public registerSprite<S extends Sprite>(
		type: S['type'],
		name: string,
		builder: SpriteBuilder<S>,
	): void {
		this.sprites.set(type, builder as SpriteBuilder<Sprite>);
		this.spriteNames.set(type, name);
	}

	public async buildAnimation(
		animation: Animation,
		sprite: PIXI.DisplayObject,
		app: PIXI.Application,
	) {
		const builder = this.animations.get(animation.type);
		if (builder) {
			await builder(animation, sprite, app);
		} else {
			console.warn(
				`Splash | Animation Type ${animation.type} not found. Did not create.`,
			);
		}
	}

	public async processAction(action: Action): Promise<void> {
		const processor = this.actions.get(action.type);
		if (processor) {
			await processor(action);
		}
	}

	public async buildSprite(sprite: Sprite, state: State) {
		const builder = this.sprites.get(sprite.type);
		if (builder) {
			return builder(sprite, state);
		} else {
			console.warn(
				`Splash | Sprite type ${sprite.type} not found. Did not create.`,
			);
			return undefined;
		}
	}

	private static instance: SplashAPI | undefined;

	public static getInstance() {
		if (!this.instance) {
			this.instance = new SplashAPI();
		}
		return this.instance;
	}
}
