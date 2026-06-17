import type { Create, Initialized } from './helpers.ts';

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

export type MacroActionCreate = Create<typeof MacroActionSchemaCreator>;
export type MacroActionInitialized = Initialized<typeof MacroActionSchemaCreator>;
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

export type ChangeStateActionCreate = Create<typeof ChangeStateActionSchemaCreator>;
export type ChangeStateActionInitialized = Initialized<typeof ChangeStateActionSchemaCreator>;
export type ChangeStateAction = ChangeStateActionCreate | ChangeStateActionInitialized;

function CloseActionSchemaCreator() {
	const base = BaseActionSchemaCreator('close');
	return {
		...base,
	};
}

export type CloseActionCreate = Create<typeof CloseActionSchemaCreator>;
export type CloseActionInitialized = Initialized<typeof CloseActionSchemaCreator>;
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

export type SetValueActionCreate = Create<typeof SetValueActionSchemaCreator>;
export type SetValueActionInitialized = Initialized<typeof SetValueActionSchemaCreator>;
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

export type IncrementValueActionCreate = Create<typeof IncrementValueActionSchemaCreator>;
export type IncrementValueActionInitialized = Initialized<typeof IncrementValueActionSchemaCreator>;
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

export type VoteActionCreate = Create<typeof VoteActionSchemaCreator>;
export type VoteActionInitialized = Initialized<typeof VoteActionSchemaCreator>;
export type VoteAction = VoteActionCreate | VoteActionInitialized;

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

export type ScriptActionCreate = Create<typeof ScriptActionSchemaCreator>;
export type ScriptActionInitialized = Initialized<typeof ScriptActionSchemaCreator>;
export type ScriptAction = ScriptActionCreate | ScriptActionInitialized;

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
