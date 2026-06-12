import type {
	ActionInitialized as Action,
	AnimationInitialized as Animation,
	SpriteInitialized as Sprite,
	StateInitialized as State,
} from '../datamodel/SplashModel.ts';
import type { SpriteContext } from '../renderer/SplashRenderer.ts';
import type { SplashLayer } from '../utils/settings.ts';

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
	context: SpriteContext,
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

	public async buildSprite(sprite: Sprite, state: State, context: SpriteContext) {
		const builder = this.sprites.get(sprite.type);
		if (builder) {
			return builder(sprite, state, context);
		} else {
			console.warn(
				`Splash | Sprite type ${sprite.type} not found. Did not create.`,
			);
			return undefined;
		}
	}

	/** Registered animation types with display names (for editors and pickers). */
	public get registeredAnimations(): { type: string; name: string }[] {
		return Array.from(this.animationNames.entries()).map(([type, name]) => ({ type, name }));
	}

	/** Registered action types with display names (for editors and pickers). */
	public get registeredActions(): { type: string; name: string }[] {
		return Array.from(this.actionNames.entries()).map(([type, name]) => ({ type, name }));
	}

	/**
	 * Show a splash page (macro/module entry point). The caller must be a GM or page owner.
	 * `global` (GM only) shows it to the whole table and persists across reloads;
	 * `targetUser` shows it transiently to one player; otherwise it opens locally.
	 */
	public async show(
		uuid: string,
		{ layer = 'full', global = false, targetUser }: { layer?: SplashLayer; global?: boolean; targetUser?: string } = {},
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
		if (global && game.user?.isGM) {
			const { launchGlobalSplash } = await import('../apps/controller.ts');
			await launchGlobalSplash(page, layer);
			return;
		}
		if (targetUser) {
			const { broadcastShowSplash } = await import('../utils/socket.ts');
			broadcastShowSplash(uuid, layer, targetUser);
			return;
		}
		const { openSplashOverlay } = await import('../apps/overlay.ts');
		await openSplashOverlay(page, { layer });
	}

	/** Open a page as a handout window (player-closable). Caller must be a GM or page owner. */
	public async openHandout(uuid: string): Promise<void> {
		const { canTriggerSplash, isSplashPage } = await import('../utils/launch.ts');
		const page = await fromUuid(uuid);
		if (!isSplashPage(page) || !canTriggerSplash(page)) {
			ui.notifications?.warn('Splash | You lack permission to open this handout.');
			return;
		}
		const { openHandout } = await import('../apps/handout.ts');
		await openHandout(page);
	}

	/** Close the active splash locally; `global` (GM only) kills it for the whole table. */
	public async close({ global = false }: { global?: boolean } = {}): Promise<void> {
		if (global && game.user?.isGM) {
			const { killGlobalSplash } = await import('../apps/controller.ts');
			await killGlobalSplash();
			return;
		}
		Hooks.call('splash.close-splash');
	}

	private static instance: SplashAPI | undefined;

	public static getInstance() {
		if (!this.instance) {
			this.instance = new SplashAPI();
		}
		return this.instance;
	}
}
