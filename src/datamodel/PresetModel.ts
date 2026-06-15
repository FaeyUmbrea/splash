import {
	ActionFieldCreator,
	AnimationFieldCreator,
	ButtonImageSchemaCreator,
	ButtonLabelSchemaCreator,
	SpriteFieldCreator,
} from './SplashModel.ts';

/**
 * A reusable styled artifact (`splash.preset` JournalEntryPage subtype) reusing SplashModel's field
 * factories so a preset validates identically to live splash data. `payload` is a discriminated union
 * keyed by `payload.type`, which IS the preset kind, so no separate `kind` field exists.
 */

/** Preset kinds, equal to `payload.type`. */
export type PresetKind = 'nineslice' | 'button' | 'animation' | 'sprite' | 'spriteGroup';

/** A button's style + label + image set + onClick only, with the runtime/placement base dropped. */
function presetButtonRecord() {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: ['button'] }),
		label: new fields.SchemaField(ButtonLabelSchemaCreator(), { required: true }),
		image: new fields.SchemaField(ButtonImageSchemaCreator(), { required: true }),
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

function PresetModelSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		notes: new fields.StringField({ required: false }),
		// Registered PrefabBehavior key: applying re-runs the behavior's dialog + build instead of stamping the
		// payload (which is then a preview). Null for plain style/content presets.
		behavior: new fields.StringField({ required: false, nullable: true, initial: null }),
		payload: new fields.TypedSchemaField({
			// Multi-field records get a discriminator `type` + the reused factory fields.
			nineslice: { type: new fields.StringField({ required: true, choices: ['nineslice'] }), ...ButtonImageSchemaCreator() },
			button: presetButtonRecord(),
			// Single-field payloads ride under `value` next to the discriminator.
			animation: { type: new fields.StringField({ required: true, choices: ['animation'] }), value: AnimationFieldCreator() },
			sprite: { type: new fields.StringField({ required: true, choices: ['sprite'] }), value: SpriteFieldCreator() },
			spriteGroup: { type: new fields.StringField({ required: true, choices: ['spriteGroup'] }), value: new fields.ArrayField(SpriteFieldCreator(), { required: true, initial: [] }) },
		}, { required: true }),
	};
}

export class PresetModel extends foundry.abstract.TypeDataModel<
	ReturnType<typeof PresetModelSchemaCreator>,
	JournalEntryPage
> {
	static override defineSchema() {
		return PresetModelSchemaCreator();
	}
}

export type PresetCreate = foundry.data.fields.SchemaField.CreateData<ReturnType<typeof PresetModelSchemaCreator>>;
export type PresetInitialized = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof PresetModelSchemaCreator>>;
