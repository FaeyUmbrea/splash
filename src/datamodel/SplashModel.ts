import { nanoid } from 'nanoid';

function GlitchEffectSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: ['glitch'] }),
		bands: new fields.NumberField({ required: true, initial: 8 }),
		// Tear distance as a fraction of the sprite's width; static effects read subtler than transitions.
		intensity: new fields.NumberField({ required: true, initial: 0.01 }),
		tint: new fields.ColorField({ required: true, initial: '#0044ff' }),
	};
}

export type GlitchEffectCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof GlitchEffectSchemaCreator>>;
export type GlitchEffectInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof GlitchEffectSchemaCreator>>;
export type GlitchEffect = GlitchEffectCreate | GlitchEffectInitialized;

// Persistent sprite effects (no transition timing); distinct from animations.
function EffectFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		glitch: new fields.SchemaField(GlitchEffectSchemaCreator()),
	});
}

export type EffectInitialized = GlitchEffectInitialized;
export type EffectCreate = GlitchEffectCreate;
export type Effect = EffectCreate | EffectInitialized;

function BaseSpriteSchemaCreator(choice: string) {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: [choice] }),
		// Sprites need distinct ids: the runtime tracks rendered sprites by this key.
		id: new fields.StringField({ required: true, blank: false, initial: () => nanoid() }),
		name: new fields.StringField({ required: true }),
		// Grouping tag: sprites sharing a groupId move/select as a unit and form a node in the runtime
		// tree. null = ungrouped. Purely a tag — no nested container type.
		groupId: new fields.StringField({ required: false, nullable: true, initial: null }),
		// Free-form per-element data handed to inline macros as `scope.context` (e.g. {Keyword, Position}).
		// ObjectField = arbitrary JSON, since context shape is behavior-specific.
		context: new fields.ObjectField({ required: false }),
		animIn: AnimationFieldCreator(),
		animOut: AnimationFieldCreator(),
		// Persistent (non-transition) effects, applied for the sprite's whole life. GL-only.
		effects: new fields.ArrayField(EffectFieldCreator(), { required: true, initial: [] }),
		states: new fields.TypedObjectField(new fields.SchemaField(StateSchemaCreator()), { required: true }),
		x: new fields.NumberField({ required: true, initial: 0 }),
		y: new fields.NumberField({ required: true, initial: 0 }),
		// null means "natural size" — 0 would collapse the sprite.
		height: new fields.NumberField({ nullable: true, initial: null }),
		width: new fields.NumberField({ nullable: true, initial: null }),
	};
}

export type BaseSprite = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof BaseSpriteSchemaCreator>>;

export function ButtonLabelSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		text: new fields.StringField({ required: true }),
		fontSize: new fields.NumberField({ required: true }),
		strokeThickness: new fields.NumberField({ required: true }),
		stroke: new fields.StringField({ required: true }),
		fill: new fields.StringField({ required: true }),
	};
}

export type ButtonLabelInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof ButtonLabelSchemaCreator>>;
export type ButtonLabelCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof ButtonLabelSchemaCreator>>;
export type ButtonLabel = ButtonLabelCreate | ButtonLabelInitialized;

export function ButtonImageSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		url: new fields.StringField({ required: true }),
		leftWidth: new fields.NumberField({ required: true }),
		topHeight: new fields.NumberField({ required: true }),
		rightWidth: new fields.NumberField({ required: true }),
		bottomHeight: new fields.NumberField({ required: true }),
	};
}

export type ButtonImageInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof ButtonImageSchemaCreator>>;
export type ButtonImageCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof ButtonImageSchemaCreator>>;
export type ButtonImage = ButtonImageCreate | ButtonImageInitialized;

function BaseActionSchemaCreator(choice: string) {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: [choice] }),
	};
}

function MacroActionSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseActionSchemaCreator('macro');
	return {
		...base,
		macro: new fields.ForeignDocumentField(Macro),
	};
}

export type MacroActionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof MacroActionSchemaCreator>>;
export type MacroActionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof MacroActionSchemaCreator>>;
export type MacroAction = MacroActionCreate | MacroActionInitialized;

function ChangeStateActionSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseActionSchemaCreator('change-state');
	return {
		...base,
		load: new fields.ArrayField(new fields.StringField(), { required: true }),
		unload: new fields.ArrayField(new fields.StringField(), { required: true }),
		// Optional value gate: the transition only fires when every entry matches
		// the runtime's current values (e.g. a combination lock).
		conditions: new fields.TypedObjectField(new fields.StringField({ required: true }), { required: false, nullable: true, initial: null }),
	};
}

export type ChangeStateActionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof ChangeStateActionSchemaCreator>>;
export type ChangeStateActionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof ChangeStateActionSchemaCreator>>;
export type ChangeStateAction = ChangeStateActionCreate | ChangeStateActionInitialized;

function CloseActionSchemaCreator() {
	const base = BaseActionSchemaCreator('close');
	return {
		...base,
	};
}

export type CloseActionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof CloseActionSchemaCreator>>;
export type CloseActionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof CloseActionSchemaCreator>>;
export type CloseAction = CloseActionCreate | CloseActionInitialized;

function SetValueActionSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseActionSchemaCreator('set-value');
	return {
		...base,
		key: new fields.StringField({ required: true }),
		value: new fields.StringField({ required: true, initial: '' }),
	};
}

export type SetValueActionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof SetValueActionSchemaCreator>>;
export type SetValueActionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof SetValueActionSchemaCreator>>;
export type SetValueAction = SetValueActionCreate | SetValueActionInitialized;

function IncrementValueActionSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseActionSchemaCreator('increment-value');
	return {
		...base,
		key: new fields.StringField({ required: true }),
		step: new fields.NumberField({ required: true, initial: 1 }),
		min: new fields.NumberField({ nullable: true, initial: null }),
		max: new fields.NumberField({ nullable: true, initial: null }),
		// Wrapping min..max makes a single button cycle a tumbler digit.
		wrap: new fields.BooleanField({ required: true, initial: false }),
	};
}

export type IncrementValueActionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof IncrementValueActionSchemaCreator>>;
export type IncrementValueActionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof IncrementValueActionSchemaCreator>>;
export type IncrementValueAction = IncrementValueActionCreate | IncrementValueActionInitialized;

function VoteActionSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseActionSchemaCreator('vote');
	return {
		...base,
		// One vote per player; revoting switches it. Tallies surface as
		// `vote:<optionId>` values for {token} display when visibility allows.
		optionId: new fields.StringField({ required: true }),
	};
}

/**
 * An INLINE macro carried on the action itself (vs the `macro` action's reference to a world-local Macro
 * document). The source runs with `scope` = the firing sprite's node in the materialized tree, so it
 * navigates relatively (`scope.parent.child.get("Top").text = "A"`) and reads `scope.context`. Inline =
 * travels with a prefab; the trust surface is Foundry's existing macro model.
 */
function ScriptActionSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseActionSchemaCreator('script');
	return {
		...base,
		source: new fields.StringField({ required: true, initial: '' }),
	};
}

export type ScriptActionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof ScriptActionSchemaCreator>>;
export type ScriptActionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof ScriptActionSchemaCreator>>;
export type ScriptAction = ScriptActionCreate | ScriptActionInitialized;

export type VoteActionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof VoteActionSchemaCreator>>;
export type VoteActionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof VoteActionSchemaCreator>>;
export type VoteAction = VoteActionCreate | VoteActionInitialized;

export function ActionFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		'macro': new fields.SchemaField(MacroActionSchemaCreator()),
		'change-state': new fields.SchemaField(ChangeStateActionSchemaCreator()),
		'close': new fields.SchemaField(CloseActionSchemaCreator()),
		'set-value': new fields.SchemaField(SetValueActionSchemaCreator()),
		'increment-value': new fields.SchemaField(IncrementValueActionSchemaCreator()),
		'vote': new fields.SchemaField(VoteActionSchemaCreator()),
		'script': new fields.SchemaField(ScriptActionSchemaCreator()),
	});
}

export type ActionInitialized = MacroActionInitialized | ChangeStateActionInitialized | CloseActionInitialized | SetValueActionInitialized | IncrementValueActionInitialized | VoteActionInitialized | ScriptActionInitialized;
export type ActionCreate = MacroActionCreate | ChangeStateActionCreate | CloseActionCreate | SetValueActionCreate | IncrementValueActionCreate | VoteActionCreate | ScriptActionCreate;
export type Action = ActionCreate | ActionInitialized;

export function ButtonSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('button');
	return {
		...base,
		label: new fields.SchemaField(ButtonLabelSchemaCreator(), { required: true }),
		image: new fields.SchemaField(ButtonImageSchemaCreator(), { required: true }),
		// Optional variants must initialize to null, not an empty object — the
		// renderers treat any truthy value as "use this label/image".
		clickLabel: new fields.SchemaField(ButtonLabelSchemaCreator(), { nullable: true, initial: null }),
		clickImage: new fields.SchemaField(ButtonImageSchemaCreator(), { nullable: true, initial: null }),
		hoverLabel: new fields.SchemaField(ButtonLabelSchemaCreator(), { nullable: true, initial: null }),
		hoverImage: new fields.SchemaField(ButtonImageSchemaCreator(), { nullable: true, initial: null }),
		tint: new fields.StringField(),
		hoverTint: new fields.StringField(),
		clickTint: new fields.StringField(),
		onClick: ActionFieldCreator(),
	};
}

export type ButtonSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof ButtonSpriteSchemaCreator>>;
export type ButtonSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof ButtonSpriteSchemaCreator>>;
export type ButtonSprite = ButtonSpriteCreate | ButtonSpriteInitialized;

function ImageSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('image');
	return {
		...base,
		img: new fields.StringField({ required: true }),
	};
}

export type ImageSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof ImageSpriteSchemaCreator>>;
export type ImageSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof ImageSpriteSchemaCreator>>;
export type ImageSprite = ImageSpriteCreate | ImageSpriteInitialized;

function TextSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('text');
	return {
		...base,
		text: new fields.StringField({ required: true }),
		font: new fields.StringField({ initial: 'Arial' }),
		size: new fields.NumberField({ initial: 34 }),
		fillColor: new fields.StringField({ initial: '#ffffff' }),
		align: new fields.StringField({ choices: ['left', 'center', 'right', 'justify'], initial: 'center' }),
	};
}

export type TextSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof TextSpriteSchemaCreator>>;
export type TextSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof TextSpriteSchemaCreator>>;
export type TextSprite = TextSpriteCreate | TextSpriteInitialized;

/** A flat fill/border/radius surface — the asset-free building block (tumbler bodies, backing plates). */
export function PanelSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('panel');
	return {
		...base,
		// Empty string = transparent (no fill / no border).
		fill: new fields.StringField({ required: true, initial: '#222831' }),
		borderColor: new fields.StringField({ required: true, initial: '#000000' }),
		borderWidth: new fields.NumberField({ required: true, initial: 0 }),
		radius: new fields.NumberField({ required: true, initial: 0 }),
	};
}

export type PanelSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof PanelSpriteSchemaCreator>>;
export type PanelSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof PanelSpriteSchemaCreator>>;
export type PanelSprite = PanelSpriteCreate | PanelSpriteInitialized;

export function SpriteFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		button: ButtonSpriteSchemaCreator(),
		image: ImageSpriteSchemaCreator(),
		text: TextSpriteSchemaCreator(),
		panel: PanelSpriteSchemaCreator(),
	});
}

export type SpriteInitialized = ButtonSpriteInitialized | ImageSpriteInitialized | TextSpriteInitialized | PanelSpriteInitialized;
export type SpriteCreate = ButtonSpriteCreate | ImageSpriteCreate | TextSpriteCreate | PanelSpriteCreate;
export type Sprite = SpriteCreate | SpriteInitialized;

function BaseAnimationModelSchemaCreator(choice: string, props) {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: [choice] }),
		duration: new fields.NumberField({ required: true }),
		delay: new fields.NumberField({ required: true }),
		props,
	};
}

function DissolveAnimationSchemaCreator() {
	const fields = foundry.data.fields;
	return BaseAnimationModelSchemaCreator('dissolve', new fields.TypedSchemaField({
		fixedOrigins: {
			type: new fields.StringField({ required: true, choices: ['fixedOrigins'] }),
			origins: new fields.ArrayField(new fields.NumberField(), { required: true }),
		},
		randomOrigins: {
			type: new fields.StringField({ required: true, choices: ['randomOrigins'] }),
			randomOrigins: new fields.BooleanField({ required: true, initial: true }),
			numOrigins: new fields.NumberField({ required: true }),
		},
	}, { required: true }));
}

export type DissolveAnimationCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof DissolveAnimationSchemaCreator>>;
export type DissolveAnimationInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof DissolveAnimationSchemaCreator>>;
export type DissolveAnimation = DissolveAnimationCreate | DissolveAnimationInitialized;

function OriginVariantsFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		fixedOrigins: {
			type: new fields.StringField({ required: true, choices: ['fixedOrigins'] }),
			origins: new fields.ArrayField(new fields.NumberField(), { required: true }),
		},
		randomOrigins: {
			type: new fields.StringField({ required: true, choices: ['randomOrigins'] }),
			randomOrigins: new fields.BooleanField({ required: true, initial: true }),
			numOrigins: new fields.NumberField({ required: true }),
		},
	}, { required: true });
}

function GlitchAnimationSchemaCreator() {
	const fields = foundry.data.fields;
	return BaseAnimationModelSchemaCreator('glitch', new fields.SchemaField({
		// Same origin-driven reveal as the dissolve; the border treatment differs.
		origins: OriginVariantsFieldCreator(),
		bands: new fields.NumberField({ required: true, initial: 20 }),
		// Horizontal tear distance as a fraction of the screen.
		intensity: new fields.NumberField({ required: true, initial: 0.05 }),
		tint: new fields.ColorField({ required: true, initial: '#0044ff' }),
		invert: new fields.BooleanField({ required: true, initial: false }),
	}, { required: true }));
}

export type GlitchAnimationCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof GlitchAnimationSchemaCreator>>;
export type GlitchAnimationInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof GlitchAnimationSchemaCreator>>;
export type GlitchAnimation = GlitchAnimationCreate | GlitchAnimationInitialized;

export function AnimationFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		dissolve: DissolveAnimationSchemaCreator(),
		glitch: GlitchAnimationSchemaCreator(),
	}, { required: false });
}

export type AnimationInitialized = DissolveAnimationInitialized | GlitchAnimationInitialized;
export type AnimationCreate = DissolveAnimationCreate | GlitchAnimationCreate;
export type Animation = AnimationCreate | AnimationInitialized;

function StateDefinitionSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		label: new fields.StringField({ required: true, initial: '' }),
		// Actions executed when the state finishes loading (e.g. a door-unlock macro).
		onEnter: new fields.ArrayField(ActionFieldCreator(), { required: true, initial: [] }),
	};
}

export type StateDefinitionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof StateDefinitionSchemaCreator>>;
export type StateDefinitionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof StateDefinitionSchemaCreator>>;
export type StateDefinition = StateDefinitionCreate | StateDefinitionInitialized;

function SplashModelSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		// local: every client runs its own copy. synced: one shared state for the
		// whole table, executed on the GM client (e.g. a communal puzzle).
		mode: new fields.StringField({ required: true, choices: ['local', 'synced'], initial: 'local' }),
		// 'all': vote tallies are written into shared values (players see pips);
		// 'gm': tallies stay on the GM client (control surface only).
		voteVisibility: new fields.StringField({ required: true, choices: ['all', 'gm'], initial: 'all' }),
		// scene/hud/full = fullscreen splash (with its stacking layer); handout = windowed app.
		// One enum selects both the kind (splash vs handout) and, for splashes, the layer.
		layer: new fields.StringField({ required: true, choices: ['scene', 'hud', 'full', 'handout'], initial: 'full' }),
		// Surfaces this splash in the scene-control "global" tab.
		global: new fields.BooleanField({ required: true, initial: false }),
		// Scene ids this splash is pinned to (scene-control "pinned" tab). World-local; missing ids ignored.
		scenePins: new fields.SetField(new fields.StringField({ required: true, blank: false }), { required: true, initial: [] }),
		// Locked window size for handout-layer splashes; null for fullscreen layers.
		handoutSize: new fields.SchemaField({
			width: new fields.NumberField({ required: true, initial: 800, positive: true, integer: true }),
			height: new fields.NumberField({ required: true, initial: 600, positive: true, integer: true }),
		}, { required: false, nullable: true, initial: null }),
		children: new fields.ArrayField(
			SpriteFieldCreator(),
		),
		// Optional display names for object groups, keyed by the shared `groupId` the members carry.
		// Editor-only metadata; a group with no entry falls back to a positional label.
		groups: new fields.TypedObjectField(new fields.SchemaField({
			name: new fields.StringField({ required: true, initial: '' }),
		}), { required: false, initial: {} }),
		initialState: new fields.ArrayField(new fields.StringField(), {
			required: true,
			initial: ['initial'],
		}),
		animIn: AnimationFieldCreator(),
		animOut: AnimationFieldCreator(),
		states: new fields.TypedObjectField(new fields.SchemaField(StateDefinitionSchemaCreator()), {
			required: true,
			initial: { initial: { label: 'Initial State', onEnter: [] } },
		}),
		// Named runtime values with their initial (string) contents; the runtime's
		// interactivity (tumblers, counters, conditions) lives on these.
		values: new fields.TypedObjectField(new fields.StringField({ required: true, initial: '' }), {
			required: true,
			initial: {},
		}),
	};
}

function StateSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		priority: new fields.NumberField({ initial: 0 }),
		name: new fields.StringField({ initial: '' }),
		x: new fields.NumberField({ initial: 0 }),
		y: new fields.NumberField({ initial: 0 }),
		zIndex: new fields.NumberField({ initial: 0 }),
		// null means "keep the sprite's current/natural size" — 0 would collapse it.
		width: new fields.NumberField({ nullable: true, initial: null }),
		height: new fields.NumberField({ nullable: true, initial: null }),
		// Faux-3D tilt, in degrees (CSS uses deg directly; the Pixi path converts to radians).
		skewX: new fields.NumberField({ required: true, initial: 0 }),
		skewY: new fields.NumberField({ required: true, initial: 0 }),
		animIn: AnimationFieldCreator(),
		animOut: AnimationFieldCreator(),
	};
}

export type StateCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof StateSchemaCreator>>;
export type StateInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof StateSchemaCreator>>;
export type State = StateCreate | StateInitialized;

export class SplashModel extends foundry.abstract.TypeDataModel<
	ReturnType<typeof SplashModelSchemaCreator>,
	JournalEntryPage
> {
	static override defineSchema() {
		return SplashModelSchemaCreator();
	}
}

export type SplashCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof SplashModelSchemaCreator>>;
export type SplashInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof SplashModelSchemaCreator>>;
export type Splash = SplashCreate | SplashInitialized;
