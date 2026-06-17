import type { Create, Initialized } from './schema/helpers.ts';
import { AnimationFieldCreator } from './schema/animations.ts';
import { SpriteFieldCreator } from './schema/sprites.ts';
import { StateDefinitionSchemaCreator } from './schema/states.ts';

// Re-export the whole schema so callers keep importing types from '../datamodel/SplashModel.ts'.
export * from './schema/index.ts';

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

export class SplashModel extends foundry.abstract.TypeDataModel<
	ReturnType<typeof SplashModelSchemaCreator>,
	JournalEntryPage
> {
	static override defineSchema() {
		return SplashModelSchemaCreator();
	}
}

export type SplashCreate = Create<typeof SplashModelSchemaCreator>;
export type SplashInitialized = Initialized<typeof SplashModelSchemaCreator>;
export type Splash = SplashCreate | SplashInitialized;
