import type { Create, Initialized } from './helpers.ts';

function BaseAnimationModelSchemaCreator(choice: string, props) {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: [choice] }),
		duration: new fields.NumberField({ required: true }),
		delay: new fields.NumberField({ required: true }),
		props,
	};
}

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

export type DissolveAnimationCreate = Create<typeof DissolveAnimationSchemaCreator>;
export type DissolveAnimationInitialized = Initialized<typeof DissolveAnimationSchemaCreator>;
export type DissolveAnimation = DissolveAnimationCreate | DissolveAnimationInitialized;

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

export type GlitchAnimationCreate = Create<typeof GlitchAnimationSchemaCreator>;
export type GlitchAnimationInitialized = Initialized<typeof GlitchAnimationSchemaCreator>;
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

export type PixelateAnimationCreate = Create<typeof PixelateAnimationSchemaCreator>;
export type PixelateAnimationInitialized = Initialized<typeof PixelateAnimationSchemaCreator>;
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
