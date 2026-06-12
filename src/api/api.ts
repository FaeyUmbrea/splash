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

	/**
	 * Show a splash page (macro/module entry point), locally and optionally for other players.
	 * The caller must be a GM or an owner of the page.
	 */
	public async show(
		uuid: string,
		{ popover = false, broadcast = false, targetUser }: { popover?: boolean; broadcast?: boolean; targetUser?: string } = {},
	): Promise<void> {
		const { canTriggerSplash, isSplashPage } = await import('../utils/launch.ts');
		const page = await fromUuid(uuid);
		if (!isSplashPage(page)) {
			ui.notifications?.warn(`Splash | ${uuid} is not a splash journal page.`);
			return;
		}
		if (!canTriggerSplash(page)) {
			ui.notifications?.warn('Splash | You lack permission to show this splash.');
			return;
		}
		const { openSplashOverlay } = await import('../apps/overlay.ts');
		await openSplashOverlay(page, popover);
		if (broadcast) {
			const { broadcastShowSplash } = await import('../utils/socket.ts');
			broadcastShowSplash(uuid, popover, targetUser);
		}
	}

	/** Close the active splash locally; GMs can also close it for other players. */
	public async close({ broadcast = false, targetUser }: { broadcast?: boolean; targetUser?: string } = {}): Promise<void> {
		Hooks.call('splash.close-splash');
		if (broadcast && game.user?.isGM) {
			const { broadcastCloseSplash } = await import('../utils/socket.ts');
			broadcastCloseSplash(targetUser);
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
