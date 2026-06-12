import { nanoid } from 'nanoid';

function BaseSpriteSchemaCreator(choice: string) {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: [choice] }),
		// Sprites need distinct ids: the runtime tracks rendered sprites by this key.
		id: new fields.StringField({ required: true, blank: false, initial: () => nanoid() }),
		name: new fields.StringField({ required: true }),
		animIn: AnimationFieldCreator(),
		animOut: AnimationFieldCreator(),
		states: new fields.TypedObjectField(new fields.SchemaField(StateSchemaCreator()), { required: true }),
		x: new fields.NumberField({ required: true, initial: 0 }),
		y: new fields.NumberField({ required: true, initial: 0 }),
		height: new fields.NumberField({ required: true, initial: 0 }),
		width: new fields.NumberField({ required: true, initial: 0 }),
	};
}

export type BaseSprite = foundry.data.fields.SchemaField.InitializedData<ReturnType<typeof BaseSpriteSchemaCreator>>;

function ButtonLabelSchemaCreator() {
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

function ButtonImageSchemaCreator() {
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

function ActionFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		'macro': new fields.SchemaField(MacroActionSchemaCreator()),
		'change-state': new fields.SchemaField(ChangeStateActionSchemaCreator()),
		'close': new fields.SchemaField(CloseActionSchemaCreator()),
	});
}

export type ActionInitialized = MacroActionInitialized | ChangeStateActionInitialized | CloseActionInitialized;
export type ActionCreate = MacroActionCreate | ChangeStateActionCreate | CloseActionCreate;
export type Action = ActionCreate | ActionInitialized;

function ButtonSpriteSchemaCreator() {
	const fields = foundry.data.fields;
	const base = BaseSpriteSchemaCreator('button');
	return {
		...base,
		label: new fields.SchemaField(ButtonLabelSchemaCreator(), { required: true }),
		image: new fields.SchemaField(ButtonImageSchemaCreator(), { required: true }),
		clickLabel: new fields.SchemaField(ButtonLabelSchemaCreator()),
		clickImage: new fields.SchemaField(ButtonImageSchemaCreator()),
		hoverLabel: new fields.SchemaField(ButtonLabelSchemaCreator()),
		hoverImage: new fields.SchemaField(ButtonImageSchemaCreator()),
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

function SpriteFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		button: ButtonSpriteSchemaCreator(),
		image: ImageSpriteSchemaCreator(),
		text: TextSpriteSchemaCreator(),
	});
}

export type SpriteInitialized = ButtonSpriteInitialized | ImageSpriteInitialized | TextSpriteInitialized;
export type SpriteCreate = ButtonSpriteCreate | ImageSpriteCreate | TextSpriteCreate;
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

function AnimationFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		dissolve: DissolveAnimationSchemaCreator(),
	}, { required: false });
}

export type AnimationInitialized = DissolveAnimationInitialized;
export type AnimationCreate = DissolveAnimationCreate;
export type Animation = AnimationCreate | AnimationInitialized;

function SplashModelSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		children: new fields.ArrayField(
			SpriteFieldCreator(),
		),
		initialState: new fields.ArrayField(new fields.StringField(), {
			required: true,
			initial: ['initial'],
		}),
		animIn: AnimationFieldCreator(),
		animOut: AnimationFieldCreator(),
		states: new fields.TypedObjectField(new fields.StringField(), { required: true, initial: { initial: 'Initial State' } }),
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
		width: new fields.NumberField({ initial: 0 }),
		height: new fields.NumberField({ initial: 0 }),
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
