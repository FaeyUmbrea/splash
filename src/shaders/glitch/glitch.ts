import type { GlitchAnimationInitialized } from '../../datamodel/SplashModel.ts';
import { Dissolve, originsFromProps } from '../dissolve/dissolve.ts';
import { getNoiseMaterial } from '../materials.js';
import { MAX_BANDS, REROLL_MS, rollBands } from './bands.ts';
import fragmentShader from './fragment.glsl';

export type GlitchFilterProps = GlitchAnimationInitialized['props'];

interface GlitchSettings {
	bands: number;
	intensity: number;
	tint: [number, number, number];
}

/** Structurally a dissolve: same origin-driven reveal, but the border zone is a glitch. */
export default async function GlitchFilter(
	app: PIXI.Application,
	animation: GlitchAnimationInitialized,
): Promise<Glitch> {
	const props = animation.props as GlitchFilterProps;
	const tint = foundry.utils.Color.from(props?.tint ?? '#0044ff');
	return new Glitch(
		originsFromProps(app, (props?.origins ?? { type: 'randomOrigins', randomOrigins: true, numOrigins: 2 }) as any),
		await getNoiseMaterial(),
		props?.invert ?? false,
		app,
		{
			bands: props?.bands ?? 20,
			intensity: props?.intensity ?? 0.05,
			tint: [tint.r, tint.g, tint.b],
		},
	);
}

export class Glitch extends Dissolve {
	#lastRoll = 0;
	#bandTable = new Float32Array(MAX_BANDS * 3);
	#numBands = 0;

	constructor(
		origins: number[],
		noise: PIXI.Texture,
		invert: boolean,
		app: PIXI.Application,
		public glitch: GlitchSettings,
	) {
		super(origins, noise, invert, app, fragmentShader);
	}

	override apply(
		filterManager: PIXI.FilterSystem,
		input: PIXI.RenderTexture,
		output: PIXI.RenderTexture,
		clearMode?: PIXI.CLEAR_MODES,
	) {
		const now = Date.now();
		if (now - this.#lastRoll > REROLL_MS) {
			this.#lastRoll = now;
			this.#numBands = rollBands(
				this.#bandTable,
				this.app.renderer.height,
				this.glitch.intensity * this.app.renderer.width,
				this.glitch.bands,
			);
		}
		this.uniforms.bands = this.#bandTable;
		this.uniforms.numBands = this.#numBands;
		this.uniforms.horizontal = false;
		this.uniforms.aberrationPx = this.glitch.intensity * this.app.renderer.width * 0.15;
		this.uniforms.tint = this.glitch.tint;
		super.apply(filterManager, input, output, clearMode);
	}
}
