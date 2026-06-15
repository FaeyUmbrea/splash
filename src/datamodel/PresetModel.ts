import {
	ActionFieldCreator,
	AnimationFieldCreator,
	ButtonImageSchemaCreator,
	ButtonLabelSchemaCreator,
	SpriteFieldCreator,
} from './SplashModel.ts';

/** Preset kinds, equal to `payload.type`. */
export type PresetKind = 'nineslice' | 'button' | 'animation' | 'sprite' | 'spriteGroup';

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
		// A PrefabBehavior key; applying re-runs that behavior's dialog and build rather than stamping the payload.
		behavior: new fields.StringField({ required: false, nullable: true, initial: null }),
		payload: new fields.TypedSchemaField({
			nineslice: { type: new fields.StringField({ required: true, choices: ['nineslice'] }), ...ButtonImageSchemaCreator() },
			button: presetButtonRecord(),
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
