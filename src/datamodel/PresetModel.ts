import {
	ActionFieldCreator,
	AnimationFieldCreator,
	ButtonImageSchemaCreator,
	ButtonLabelSchemaCreator,
	SpriteFieldCreator,
} from './SplashModel.ts';

/**
 * A reusable, styled artifact the user saves once and applies to any splash: a nine-slice config, a
 * styled button, an animation config, a styled sprite, or a sprite group. Presets are a JournalEntryPage
 * subtype (`splash.preset`) — system-neutral, UUID-addressable, compendium-shareable, and migrated by
 * core for free — and reuse the EXACT field factories from SplashModel so a preset validates identically
 * to live splash data and the two can never drift.
 *
 * The `payload` is a discriminated union keyed by `payload.type`; that `type` IS the preset kind, so no
 * separate `kind` field is needed. Per Foundry's `TypedSchemaField` contract, every variant carries a
 * `type` StringField whose value equals the variant key.
 */

/** Preset kinds, equal to `payload.type`. */
export type PresetKind = 'nineslice' | 'button' | 'animation' | 'sprite' | 'spriteGroup';

/**
 * A button preset is style + label + image set + onClick ONLY — the explicit projection of a button
 * sprite with its runtime/placement base (`id`, `animIn/animOut`, `effects`, `states`, `x/y/width/height`)
 * dropped. Built from the same sub-factories as the live button so the label/image/action shapes can't
 * drift; only the field LIST is spelled out here.
 */
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
		// Registered PrefabBehavior key (e.g. the tumbler lock): the `payload` is then a preview, and applying
		// re-runs the behavior's dialog + build instead of stamping it. Null for plain style/content presets.
		behavior: new fields.StringField({ required: false, nullable: true, initial: null }),
		payload: new fields.TypedSchemaField({
			// Multi-field records get a discriminator `type` + the reused factory fields.
			nineslice: { type: new fields.StringField({ required: true, choices: ['nineslice'] }), ...ButtonImageSchemaCreator() },
			button: presetButtonRecord(),
			// These three payloads ARE single complete fields, so they ride under `value` next to the discriminator.
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
