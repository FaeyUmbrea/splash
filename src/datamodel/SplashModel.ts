import { nanoid } from 'nanoid';

function GlitchEffectSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: ['glitch'] }),
		bands: new fields.NumberField({ required: true, initial: 8 }),
		// Tear distance as a fraction of the sprite's width.
		intensity: new fields.NumberField({ required: true, initial: 0.01 }),
		tint: new fields.ColorField({ required: true, initial: '#0044ff' }),
	};
}

export type GlitchEffectCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof GlitchEffectSchemaCreator>>;
export type GlitchEffectInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof GlitchEffectSchemaCreator>>;
export type GlitchEffect = GlitchEffectCreate | GlitchEffectInitialized;

function PixelateEffectSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: ['pixelate'] }),
		// Cell size in px; rectangular cells are allowed.
		blockX: new fields.NumberField({ required: true, initial: 8 }),
		blockY: new fields.NumberField({ required: true, initial: 8 }),
		// Grid phase in px, to nudge the mosaic off an ugly seam.
		offsetX: new fields.NumberField({ required: true, initial: 0 }),
		offsetY: new fields.NumberField({ required: true, initial: 0 }),
	};
}

export type PixelateEffectCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof PixelateEffectSchemaCreator>>;
export type PixelateEffectInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof PixelateEffectSchemaCreator>>;
export type PixelateEffect = PixelateEffectCreate | PixelateEffectInitialized;

// Persistent effects with no transition timing, distinct from animIn/animOut.
function EffectFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		glitch: new fields.SchemaField(GlitchEffectSchemaCreator()),
		pixelate: new fields.SchemaField(PixelateEffectSchemaCreator()),
	});
}

export type EffectInitialized = GlitchEffectInitialized | PixelateEffectInitialized;
export type EffectCreate = GlitchEffectCreate | PixelateEffectCreate;
export type Effect = EffectCreate | EffectInitialized;

function BaseSpriteSchemaCreator(choice: string) {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: [choice] }),
		id: new fields.StringField({ required: true, blank: false, initial: () => nanoid() }),
		name: new fields.StringField({ required: true }),
		// Flat grouping tag, not a container; null means ungrouped.
		groupId: new fields.StringField({ required: false, nullable: true, initial: null }),
		// Free-form per-element data handed to inline macros as `scope.context`.
		context: new fields.ObjectField({ required: false }),
		animIn: AnimationFieldCreator(),
		animOut: AnimationFieldCreator(),
		// GL-only; ignored by the HTML renderer.
		effects: new fields.ArrayField(EffectFieldCreator(), { required: true, initial: [] }),
		states: new fields.TypedObjectField(new fields.SchemaField(StateSchemaCreator()), { required: true }),
		x: new fields.NumberField({ required: true, initial: 0 }),
		y: new fields.NumberField({ required: true, initial: 0 }),
		// null means natural size. 0 would collapse the sprite.
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
		// Gate: the transition only fires when every entry matches the runtime's current values.
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
		// One vote per player; revoting switches it. Tallies surface as `vote:<optionId>` runtime values.
		optionId: new fields.StringField({ required: true }),
	};
}

/**
 * Inline macro carried on the action itself, unlike the `macro` action which references a world Macro.
 * The source runs with `scope` bound to the firing sprite's node in the materialized tree, so it can
 * navigate relatively (`scope.parent.child.get("Top").text = "A"`) and read `scope.context`.
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

/** Fired by a draggable when released, never authored, so it has no schema in ActionFieldCreator. `zone` is the target drop zone id, '' for a miss. */
export interface DropActionInitialized { type: 'drop'; zone: string }

export type ActionInitialized = MacroActionInitialized | ChangeStateActionInitialized | CloseActionInitialized | SetValueActionInitialized | IncrementValueActionInitialized | VoteActionInitialized | ScriptActionInitialized | DropActionInitialized;
export type ActionCreate = MacroActionCreate | ChangeStateActionCreate | CloseActionCreate | SetValueActionCreate | IncrementValueActionCreate | VoteActionCreate | ScriptActionCreate;
export type Action = ActionCreate | ActionInitialized;

export function ButtonSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('button');
	return {
		...base,
		label: new fields.SchemaField(ButtonLabelSchemaCreator(), { required: true }),
		image: new fields.SchemaField(ButtonImageSchemaCreator(), { required: true }),
		// Must init to null, not {}: renderers treat any truthy value as "use this label/image".
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

export function PanelSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('panel');
	return {
		...base,
		// Empty string means transparent.
		fill: new fields.StringField({ required: true, initial: '#222831' }),
		borderColor: new fields.StringField({ required: true, initial: '#000000' }),
		borderWidth: new fields.NumberField({ required: true, initial: 0 }),
		radius: new fields.NumberField({ required: true, initial: 0 }),
	};
}

export type PanelSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof PanelSpriteSchemaCreator>>;
export type PanelSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof PanelSpriteSchemaCreator>>;
export type PanelSprite = PanelSpriteCreate | PanelSpriteInitialized;

export function GaugeSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('gauge');
	return {
		...base,
		// Runtime value name; the fill fraction reads from values[valueKey].
		valueKey: new fields.StringField({ required: true, initial: '' }),
		min: new fields.NumberField({ required: true, initial: 0 }),
		max: new fields.NumberField({ required: true, initial: 100 }),
		fillColor: new fields.StringField({ required: true, initial: '#4caf50' }),
		bgColor: new fields.StringField({ required: true, initial: '#222831' }),
		// Horizontal fills left to right; vertical fills bottom to top.
		vertical: new fields.BooleanField({ required: true, initial: false }),
	};
}

export type GaugeSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof GaugeSpriteSchemaCreator>>;
export type GaugeSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof GaugeSpriteSchemaCreator>>;
export type GaugeSprite = GaugeSpriteCreate | GaugeSpriteInitialized;

export function HotspotSpriteSchemaCreator() {
	const base = BaseSpriteSchemaCreator('hotspot');
	return {
		...base,
		onClick: ActionFieldCreator(),
	};
}

export type HotspotSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof HotspotSpriteSchemaCreator>>;
export type HotspotSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof HotspotSpriteSchemaCreator>>;
export type HotspotSprite = HotspotSpriteCreate | HotspotSpriteInitialized;

export function VideoSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('video');
	return {
		...base,
		src: new fields.StringField({ required: true }),
		loop: new fields.BooleanField({ required: true, initial: true }),
		muted: new fields.BooleanField({ required: true, initial: true }),
		autoplay: new fields.BooleanField({ required: true, initial: true }),
	};
}

export type VideoSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof VideoSpriteSchemaCreator>>;
export type VideoSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof VideoSpriteSchemaCreator>>;
export type VideoSprite = VideoSpriteCreate | VideoSpriteInitialized;

export function TextInputSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('text-input');
	return {
		...base,
		// Runtime value name the typed text writes to and reads back from.
		valueKey: new fields.StringField({ required: true, initial: '' }),
		placeholder: new fields.StringField({ required: true, initial: '' }),
		fontSize: new fields.NumberField({ required: true, initial: 18 }),
		color: new fields.StringField({ required: true, initial: '#ffffff' }),
		bgColor: new fields.StringField({ required: true, initial: '#1b1b1e' }),
	};
}

export type TextInputSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof TextInputSpriteSchemaCreator>>;
export type TextInputSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof TextInputSpriteSchemaCreator>>;
export type TextInputSprite = TextInputSpriteCreate | TextInputSpriteInitialized;

export function DraggableSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('draggable');
	return {
		...base,
		// Runtime value name; records the id of the drop zone this piece currently occupies, '' when at home.
		valueKey: new fields.StringField({ required: true, initial: '' }),
		// A piece carries this tag; a drop zone accepts it only when its `accepts` is blank or matches.
		tag: new fields.StringField({ required: true, initial: '' }),
		img: new fields.StringField({ required: true, initial: '' }),
		fill: new fields.StringField({ required: true, initial: '' }),
		radius: new fields.NumberField({ required: true, initial: 0 }),
	};
}

export type DraggableSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof DraggableSpriteSchemaCreator>>;
export type DraggableSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof DraggableSpriteSchemaCreator>>;
export type DraggableSprite = DraggableSpriteCreate | DraggableSpriteInitialized;

export function DropZoneSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('drop-zone');
	return {
		...base,
		// Blank accepts any draggable; otherwise only pieces whose `tag` matches.
		accepts: new fields.StringField({ required: true, initial: '' }),
		// Runs once a compatible piece is dropped here; gate it with conditions on the piece's value key.
		onDrop: ActionFieldCreator(),
		fill: new fields.StringField({ required: true, initial: '#22283155' }),
		borderColor: new fields.StringField({ required: true, initial: '#ffffff' }),
		borderWidth: new fields.NumberField({ required: true, initial: 2 }),
		radius: new fields.NumberField({ required: true, initial: 8 }),
		// Outline shown while a compatible piece hovers over the zone.
		highlightColor: new fields.StringField({ required: true, initial: '#4caf50' }),
	};
}

export type DropZoneSpriteCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof DropZoneSpriteSchemaCreator>>;
export type DropZoneSpriteInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof DropZoneSpriteSchemaCreator>>;
export type DropZoneSprite = DropZoneSpriteCreate | DropZoneSpriteInitialized;

export function SpriteFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		'button': ButtonSpriteSchemaCreator(),
		'image': ImageSpriteSchemaCreator(),
		'text': TextSpriteSchemaCreator(),
		'panel': PanelSpriteSchemaCreator(),
		'gauge': GaugeSpriteSchemaCreator(),
		'hotspot': HotspotSpriteSchemaCreator(),
		'video': VideoSpriteSchemaCreator(),
		'text-input': TextInputSpriteSchemaCreator(),
		'draggable': DraggableSpriteSchemaCreator(),
		'drop-zone': DropZoneSpriteSchemaCreator(),
	});
}

export type SpriteInitialized = ButtonSpriteInitialized | ImageSpriteInitialized | TextSpriteInitialized | PanelSpriteInitialized | GaugeSpriteInitialized | HotspotSpriteInitialized | VideoSpriteInitialized | TextInputSpriteInitialized | DraggableSpriteInitialized | DropZoneSpriteInitialized;
export type SpriteCreate = ButtonSpriteCreate | ImageSpriteCreate | TextSpriteCreate | PanelSpriteCreate | GaugeSpriteCreate | HotspotSpriteCreate | VideoSpriteCreate | TextInputSpriteCreate | DraggableSpriteCreate | DropZoneSpriteCreate;
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

function PixelateAnimationSchemaCreator() {
	const fields = foundry.data.fields;
	return BaseAnimationModelSchemaCreator('pixelate', new fields.SchemaField({
		origins: OriginVariantsFieldCreator(),
		// Peak cell size in px at the wave front; cells swell from sharp to this as the transition passes.
		block: new fields.NumberField({ required: true, initial: 32 }),
		invert: new fields.BooleanField({ required: true, initial: false }),
	}, { required: true }));
}

export type PixelateAnimationCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof PixelateAnimationSchemaCreator>>;
export type PixelateAnimationInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof PixelateAnimationSchemaCreator>>;
export type PixelateAnimation = PixelateAnimationCreate | PixelateAnimationInitialized;

export function AnimationFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		dissolve: DissolveAnimationSchemaCreator(),
		glitch: GlitchAnimationSchemaCreator(),
		pixelate: PixelateAnimationSchemaCreator(),
	}, { required: false });
}

export type AnimationInitialized = DissolveAnimationInitialized | GlitchAnimationInitialized | PixelateAnimationInitialized;
export type AnimationCreate = DissolveAnimationCreate | GlitchAnimationCreate | PixelateAnimationCreate;
export type Animation = AnimationCreate | AnimationInitialized;

function StateDefinitionSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		label: new fields.StringField({ required: true, initial: '' }),
		// Runs when the state finishes loading.
		onEnter: new fields.ArrayField(ActionFieldCreator(), { required: true, initial: [] }),
	};
}

export type StateDefinitionCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof StateDefinitionSchemaCreator>>;
export type StateDefinitionInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof StateDefinitionSchemaCreator>>;
export type StateDefinition = StateDefinitionCreate | StateDefinitionInitialized;

function SplashModelSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		// local: each client runs its own copy. synced: one shared state, executed on the GM client.
		mode: new fields.StringField({ required: true, choices: ['local', 'synced'], initial: 'local' }),
		// all: tallies written into shared values, visible to players. gm: tallies stay on the GM client.
		voteVisibility: new fields.StringField({ required: true, choices: ['all', 'gm'], initial: 'all' }),
		// One enum picks the kind: scene/hud/full are fullscreen splash layers, handout is a windowed app.
		layer: new fields.StringField({ required: true, choices: ['scene', 'hud', 'full', 'handout'], initial: 'full' }),
		global: new fields.BooleanField({ required: true, initial: false }),
		// Scene ids this splash is pinned to; missing ids are ignored.
		scenePins: new fields.SetField(new fields.StringField({ required: true, blank: false }), { required: true, initial: [] }),
		// Window size for handout layer; null for fullscreen layers.
		handoutSize: new fields.SchemaField({
			width: new fields.NumberField({ required: true, initial: 800, positive: true, integer: true }),
			height: new fields.NumberField({ required: true, initial: 600, positive: true, integer: true }),
		}, { required: false, nullable: true, initial: null }),
		children: new fields.ArrayField(
			SpriteFieldCreator(),
		),
		// Editor-only display names keyed by `groupId`; a missing entry falls back to a positional label.
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
		// Named runtime values, all stored as strings; counters and conditions key off these.
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
		// null keeps the sprite's current size. 0 would collapse it.
		width: new fields.NumberField({ nullable: true, initial: null }),
		height: new fields.NumberField({ nullable: true, initial: null }),
		// Degrees. CSS uses them directly; the Pixi path converts to radians.
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
