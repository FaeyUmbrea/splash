import type {
	ActionInitialized as Action,
	AnimationInitialized as Animation,
	EffectInitialized as Effect,
	SplashInitialized,
	SpriteInitialized as Sprite,
	StateInitialized as State,
} from '../datamodel/SplashModel.ts';
import type { SpriteContext } from '../renderer/SplashRenderer.ts';
import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';
import type { TriggerBinding, TriggerDefinition, TriggerOptions } from '../triggers/types.ts';
import type { SplashLayer } from '../utils/settings.ts';

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

export type EffectBuilder<E extends Effect> = (
	app: PIXI.Application,
	effect: E,
) => Promise<PIXI.Filter> | PIXI.Filter;

export class SplashAPI {
	private animations: Map<string, AnimationBuilder<Animation>> = new Map();
	private animationNames: Map<string, string> = new Map();
	private sprites: Map<string, SpriteBuilder<Sprite>> = new Map();
	private spriteNames: Map<string, string> = new Map();
	private actions: Map<string, ActionProcessor<Action>> = new Map();
	private actionNames: Map<string, string> = new Map();
	private effects: Map<string, EffectBuilder<Effect>> = new Map();
	private effectNames: Map<string, string> = new Map();
	private triggers: Map<string, TriggerDefinition> = new Map();

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

	public registerEffect<E extends Effect>(
		type: E['type'],
		name: string,
		builder: EffectBuilder<E>,
	): void {
		this.effects.set(type, builder as EffectBuilder<Effect>);
		this.effectNames.set(type, name);
	}

	public async buildEffect(app: PIXI.Application, effect: Effect): Promise<PIXI.Filter | undefined> {
		const builder = this.effects.get(effect.type);
		if (builder) {
			return builder(app, effect);
		}
		console.warn(`Splash | Effect type ${effect.type} not found. Did not create.`);
		return undefined;
	}

	public get registeredAnimations(): { type: string; name: string }[] {
		return Array.from(this.animationNames.entries()).map(([type, name]) => ({ type, name }));
	}

	public get registeredEffects(): { type: string; name: string }[] {
		return Array.from(this.effectNames.entries()).map(([type, name]) => ({ type, name }));
	}

	public get registeredActions(): { type: string; name: string }[] {
		return Array.from(this.actionNames.entries()).map(([type, name]) => ({ type, name }));
	}

	/** First-party triggers (door, region) register through this same API. */
	public registerTrigger(type: string, label: string, options: TriggerOptions): void {
		this.triggers.set(type, { type, label, ...options });
	}

	public get registeredTriggers(): TriggerDefinition[] {
		return Array.from(this.triggers.values());
	}

	public getTrigger(type: string): TriggerDefinition | undefined {
		return this.triggers.get(type);
	}

	public bindingsForSplash(splashUuid: string): TriggerBinding[] {
		return this.registeredTriggers.flatMap(t => t.listBindings()).filter(b => b.splashUuid === splashUuid);
	}

	/** Show a splash at a layer. `global` (GM) shows it table-wide and persists; `targetUser` shows it transiently to one player; otherwise local. */
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

	/** Launch using the splash's stored `layer`. `handout` opens a windowed app; `scene`/`hud`/`full` open a fullscreen overlay. */
	public async launch(
		uuid: string,
		{ global = false, targetUser }: { global?: boolean; targetUser?: string } = {},
	): Promise<void> {
		const { isSplashPage } = await import('../utils/launch.ts');
		const page = await fromUuid(uuid);
		if (!isSplashPage(page)) {
			ui.notifications?.warn(`Splash | ${uuid} is not a splash journal page.`);
			return;
		}
		const layer = (page.system as SplashInitialized).layer;
		if (layer === 'handout') {
			await this.openHandout(uuid);
			return;
		}
		// 'handout' handled above; remainder is a fullscreen SplashLayer.
		await this.show(uuid, { layer: layer as SplashLayer, global, targetUser });
	}

	public async openHandout(uuid: string): Promise<void> {
		const { canViewSplash, isSplashPage } = await import('../utils/launch.ts');
		const page = await fromUuid(uuid);
		if (!isSplashPage(page) || !canViewSplash(page)) {
			ui.notifications?.warn('Splash | You lack permission to open this handout.');
			return;
		}
		const { openHandout } = await import('../apps/handout.ts');
		await openHandout(page);
	}

	/** The current runtime snapshot of an open splash on this client, or null if it isn't open. */
	public async getSplashState(uuid: string): Promise<RuntimeSnapshot | null> {
		const { getRuntime } = await import('../utils/sync.ts');
		return getRuntime(uuid)?.snapshot ?? null;
	}

	/** Apply a runtime snapshot to an open splash on this client, mirroring another client's state. */
	public async applySplashState(uuid: string, snapshot: RuntimeSnapshot): Promise<void> {
		const { getRuntime } = await import('../utils/sync.ts');
		await getRuntime(uuid)?.applyShared(snapshot);
	}

	/** Open a splash on this client as a passive spectator mirror: no input, no presence, driven by applySplashState. */
	public async openSpectator(uuid: string): Promise<void> {
		const { isSplashPage } = await import('../utils/launch.ts');
		const page = await fromUuid(uuid);
		if (!isSplashPage(page)) return;
		const layer = (page.system as SplashInitialized).layer;
		if (layer === 'handout') {
			const { openHandout } = await import('../apps/handout.ts');
			await openHandout(page, true);
		} else {
			const { openSplashOverlay } = await import('../apps/overlay.ts');
			await openSplashOverlay(page, { layer: layer as SplashLayer, skipAnimations: true, spectate: true });
		}
		// The Svelte mount that registers the runtime is async; wait so a following applySplashState lands.
		const { getRuntime } = await import('../utils/sync.ts');
		for (let i = 0; i < 50 && !getRuntime(uuid); i++) {
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
		}
	}

	/** Close a spectator mirror opened with openSpectator. */
	public async closeSpectator(uuid: string): Promise<void> {
		const { closeSplashOverlay } = await import('../apps/overlay.ts');
		await closeSplashOverlay({ skipOutro: true });
		const page = await fromUuid(uuid) as JournalEntryPage | null;
		if (page) await foundry.applications.instances.get(`splash-handout-${page.id}`)?.close();
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
