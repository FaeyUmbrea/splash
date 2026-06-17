import type { Create, Initialized } from './helpers.ts';
import { ActionFieldCreator } from './actions.ts';
import { AnimationFieldCreator } from './animations.ts';

export function StateDefinitionSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		label: new fields.StringField({ required: true, initial: '' }),
		// Runs when the state finishes loading.
		onEnter: new fields.ArrayField(ActionFieldCreator(), { required: true, initial: [] }),
	};
}

export type StateDefinitionCreate = Create<typeof StateDefinitionSchemaCreator>;
export type StateDefinitionInitialized = Initialized<typeof StateDefinitionSchemaCreator>;
export type StateDefinition = StateDefinitionCreate | StateDefinitionInitialized;

// A sprite's per-state placement. Shared by sprites (via their `states` map).
export function StateSchemaCreator() {
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

export type StateCreate = Create<typeof StateSchemaCreator>;
export type StateInitialized = Initialized<typeof StateSchemaCreator>;
export type State = StateCreate | StateInitialized;
