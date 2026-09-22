/** A Splash data object selected by its registered `type`. */
export interface SplashTypedData {
	type: string;
}

export interface SplashAnimationData extends SplashTypedData {}
export interface SplashActionData extends SplashTypedData {}
export interface SplashEffectData extends SplashTypedData {}
export interface SplashSpriteData extends SplashTypedData {}

/** A sprite's resolved placement and transition data for one state. */
export interface SplashStateData {
	priority?: number | null;
	name?: string;
	x?: number | null;
	y?: number | null;
	zIndex?: number | null;
	width?: number | null;
	height?: number | null;
	skewX?: number | null;
	skewY?: number | null;
	animIn?: SplashAnimationData | null;
	animOut?: SplashAnimationData | null;
}

type ExtensionCallback<F extends (...args: never[]) => unknown> = {
	// Callback parameters are intentionally bivariant so extensions can register narrower data types.
	// eslint-disable-next-line ts/method-signature-style
	call(...args: Parameters<F>): ReturnType<F>;
}['call'];

export type AnimationBuilder<A extends SplashAnimationData = SplashAnimationData> = ExtensionCallback<(
	animation: A,
	sprite: PIXI.DisplayObject,
	app: PIXI.Application,
) => Promise<void> | void>;

export type SpriteBuilder<S extends SplashSpriteData = SplashSpriteData> = ExtensionCallback<(
	sprite: S,
	state: SplashStateData,
	context: SpriteContext,
) => Promise<PIXI.DisplayObject> | PIXI.DisplayObject>;

export type ActionProcessor<A extends SplashActionData = SplashActionData> = ExtensionCallback<(
	action: A,
) => Promise<void> | void>;

export type EffectBuilder<E extends SplashEffectData = SplashEffectData> = ExtensionCallback<(
	app: PIXI.Application,
	effect: E,
) => Promise<PIXI.Filter> | PIXI.Filter>;

export interface SpriteContext {
	onAction: (action: SplashActionData) => Promise<void> | void;
}

export interface FieldOption {
	value: string;
	label: string;
}

/** Describes one property rendered by Splash's built-in editors. */
export type FieldDef
	= | { type: 'number'; key: string; label?: string; step?: number; group?: string }
		| { type: 'text'; key: string; label?: string; group?: string }
		| { type: 'color'; key: string; label?: string; group?: string }
		| { type: 'checkbox'; key: string; label?: string; group?: string }
		| { type: 'code'; key: string; label?: string; hint?: string }
		| { type: 'select'; key: string; label?: string; placeholder?: string; multiple?: boolean; options?: FieldOption[]; source?: 'macros' | 'states' }
		| { type: 'conditions'; key: string };

/** Editor metadata for a registered effect, animation, or action. */
export interface EditorMeta {
	icon?: string;
	defaults?: Record<string, unknown>;
	fields?: FieldDef[];
}

export interface RegisteredType extends EditorMeta {
	type: string;
	name: string;
}

export type SplashValues = Record<string, unknown>;
export type SpriteOverrides = Record<string, unknown>;

/** Serializable state for an open Splash instance. */
export interface RuntimeSnapshot {
	loadedStates: string[];
	values: SplashValues;
	overrides: Record<string, SpriteOverrides>;
}

/** Fullscreen placement of a splash. Handouts use `openHandout` instead. */
export type SplashLayer = 'scene' | 'hud' | 'full';

/** A live trigger binding between a Foundry document and a splash. */
export interface TriggerBinding {
	id: string;
	type: string;
	splashUuid: string;
	summary: string;
	sceneId?: string;
}

/** A trigger type registered by Splash or another module. */
export interface TriggerDefinition {
	type: string;
	label: string;
	icon: string;
	createBinding: (splashUuid: string) => Promise<boolean>;
	listBindings: () => TriggerBinding[];
	removeBinding: (binding: TriggerBinding) => Promise<void>;
}

export type TriggerOptions = Omit<TriggerDefinition, 'type' | 'label'>;

/** Supported runtime API exposed as `game.modules.get('splash')?.api`. */
export interface SplashApi {
	registerAnimation: <A extends SplashAnimationData>(
		type: A['type'],
		name: string,
		builder: AnimationBuilder<A>,
		meta?: EditorMeta,
	) => void;
	registerAction: <A extends SplashActionData>(
		type: A['type'],
		name: string,
		processor: ActionProcessor<A>,
		meta?: EditorMeta,
	) => void;
	registerSprite: <S extends SplashSpriteData>(
		type: S['type'],
		name: string,
		builder: SpriteBuilder<S>,
	) => void;
	registerEffect: <E extends SplashEffectData>(
		type: E['type'],
		name: string,
		builder: EffectBuilder<E>,
		meta?: EditorMeta,
	) => void;
	registerTrigger: (type: string, label: string, options: TriggerOptions) => void;
	readonly registeredAnimations: RegisteredType[];
	readonly registeredEffects: RegisteredType[];
	readonly registeredActions: RegisteredType[];
	readonly registeredTriggers: TriggerDefinition[];
	getTrigger: (type: string) => TriggerDefinition | undefined;
	bindingsForSplash: (splashUuid: string) => TriggerBinding[];
	show: (
		uuid: string,
		options?: { layer?: SplashLayer; global?: boolean; targetUser?: string },
	) => Promise<void>;
	launch: (
		uuid: string,
		options?: { global?: boolean; targetUser?: string },
	) => Promise<void>;
	openHandout: (uuid: string) => Promise<void>;
	getSplashState: (uuid: string) => Promise<RuntimeSnapshot | null>;
	applySplashState: (uuid: string, snapshot: RuntimeSnapshot) => Promise<void>;
	openSpectator: (uuid: string) => Promise<void>;
	closeSpectator: (uuid: string) => Promise<void>;
	close: (options?: { global?: boolean }) => Promise<void>;
}

export type SplashAPI = SplashApi;
