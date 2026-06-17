import type { Create, Initialized } from './helpers.ts';

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

export type GlitchEffectCreate = Create<typeof GlitchEffectSchemaCreator>;
export type GlitchEffectInitialized = Initialized<typeof GlitchEffectSchemaCreator>;
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

export type PixelateEffectCreate = Create<typeof PixelateEffectSchemaCreator>;
export type PixelateEffectInitialized = Initialized<typeof PixelateEffectSchemaCreator>;
export type PixelateEffect = PixelateEffectCreate | PixelateEffectInitialized;

function CurvatureEffectSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: ['curvature'] }),
		// Max sample displacement at the edge, as a fraction of the box half-extent.
		strength: new fields.NumberField({ required: true, initial: 0.1 }),
		// Where the curve leaves flat (start) and how far the ramp runs (end), in distance-from-centre units.
		start: new fields.NumberField({ required: true, initial: 0.8 }),
		end: new fields.NumberField({ required: true, initial: 2 }),
	};
}

export type CurvatureEffectCreate = Create<typeof CurvatureEffectSchemaCreator>;
export type CurvatureEffectInitialized = Initialized<typeof CurvatureEffectSchemaCreator>;
export type CurvatureEffect = CurvatureEffectCreate | CurvatureEffectInitialized;

function ScanlinesEffectSchemaCreator() {
	const fields = foundry.data.fields;
	return {
		type: new fields.StringField({ required: true, choices: ['scanlines'] }),
		intensity: new fields.NumberField({ required: true, initial: 0.3 }),
		// Band period in px; steps only resolve once this is several px tall.
		thickness: new fields.NumberField({ required: true, initial: 4 }),
		// Colour mixed in at the line (black = plain darkening).
		lineColor: new fields.ColorField({ required: true, initial: '#000000' }),
		// Brightness levels across the falloff; 1 = hard line.
		steps: new fields.NumberField({ required: true, initial: 1 }),
	};
}

export type ScanlinesEffectCreate = Create<typeof ScanlinesEffectSchemaCreator>;
export type ScanlinesEffectInitialized = Initialized<typeof ScanlinesEffectSchemaCreator>;
export type ScanlinesEffect = ScanlinesEffectCreate | ScanlinesEffectInitialized;

// Persistent effects with no transition timing, distinct from animIn/animOut.
export function EffectFieldCreator() {
	const fields = foundry.data.fields;
	return new fields.TypedSchemaField({
		glitch: new fields.SchemaField(GlitchEffectSchemaCreator()),
		pixelate: new fields.SchemaField(PixelateEffectSchemaCreator()),
		curvature: new fields.SchemaField(CurvatureEffectSchemaCreator()),
		scanlines: new fields.SchemaField(ScanlinesEffectSchemaCreator()),
	});
}

export type EffectInitialized = GlitchEffectInitialized | PixelateEffectInitialized | CurvatureEffectInitialized | ScanlinesEffectInitialized;
export type EffectCreate = GlitchEffectCreate | PixelateEffectCreate | CurvatureEffectCreate | ScanlinesEffectCreate;
export type Effect = EffectCreate | EffectInitialized;
