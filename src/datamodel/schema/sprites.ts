import type { Create, Initialized } from './helpers.ts';
import { nanoid } from 'nanoid';
import { ActionFieldCreator } from './actions.ts';
import { AnimationFieldCreator } from './animations.ts';
import { EffectFieldCreator } from './effects.ts';
import { StateSchemaCreator } from './states.ts';

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

export type BaseSprite = Initialized<typeof BaseSpriteSchemaCreator>;

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

export type ButtonLabelInitialized = Initialized<typeof ButtonLabelSchemaCreator>;
export type ButtonLabelCreate = Create<typeof ButtonLabelSchemaCreator>;
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

export type ButtonImageInitialized = Initialized<typeof ButtonImageSchemaCreator>;
export type ButtonImageCreate = Create<typeof ButtonImageSchemaCreator>;
export type ButtonImage = ButtonImageCreate | ButtonImageInitialized;

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

export type ButtonSpriteCreate = Create<typeof ButtonSpriteSchemaCreator>;
export type ButtonSpriteInitialized = Initialized<typeof ButtonSpriteSchemaCreator>;
export type ButtonSprite = ButtonSpriteCreate | ButtonSpriteInitialized;

function ImageSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('image');
	return {
		...base,
		img: new fields.StringField({ required: true }),
	};
}

export type ImageSpriteCreate = Create<typeof ImageSpriteSchemaCreator>;
export type ImageSpriteInitialized = Initialized<typeof ImageSpriteSchemaCreator>;
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

export type TextSpriteCreate = Create<typeof TextSpriteSchemaCreator>;
export type TextSpriteInitialized = Initialized<typeof TextSpriteSchemaCreator>;
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

export type PanelSpriteCreate = Create<typeof PanelSpriteSchemaCreator>;
export type PanelSpriteInitialized = Initialized<typeof PanelSpriteSchemaCreator>;
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

export type GaugeSpriteCreate = Create<typeof GaugeSpriteSchemaCreator>;
export type GaugeSpriteInitialized = Initialized<typeof GaugeSpriteSchemaCreator>;
export type GaugeSprite = GaugeSpriteCreate | GaugeSpriteInitialized;

export function HotspotSpriteSchemaCreator() {
	const base = BaseSpriteSchemaCreator('hotspot');
	return {
		...base,
		onClick: ActionFieldCreator(),
	};
}

export type HotspotSpriteCreate = Create<typeof HotspotSpriteSchemaCreator>;
export type HotspotSpriteInitialized = Initialized<typeof HotspotSpriteSchemaCreator>;
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

export type VideoSpriteCreate = Create<typeof VideoSpriteSchemaCreator>;
export type VideoSpriteInitialized = Initialized<typeof VideoSpriteSchemaCreator>;
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

export type TextInputSpriteCreate = Create<typeof TextInputSpriteSchemaCreator>;
export type TextInputSpriteInitialized = Initialized<typeof TextInputSpriteSchemaCreator>;
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

export type DraggableSpriteCreate = Create<typeof DraggableSpriteSchemaCreator>;
export type DraggableSpriteInitialized = Initialized<typeof DraggableSpriteSchemaCreator>;
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

export type DropZoneSpriteCreate = Create<typeof DropZoneSpriteSchemaCreator>;
export type DropZoneSpriteInitialized = Initialized<typeof DropZoneSpriteSchemaCreator>;
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
