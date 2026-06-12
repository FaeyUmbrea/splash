import type { GlitchAnimationInitialized } from '../../datamodel/SplashModel.ts';
import { Dissolve, originsFromProps } from '../dissolve/dissolve.ts';
import { getNoiseMaterial } from '../materials.js';
import fragmentShader from './fragment.glsl';

export type GlitchFilterProps = GlitchAnimationInitialized['props'];

/** Must match MAX_BANDS in the shared shader lib. */
const MAX_BANDS = 16;

/** How often the tear pattern jumps; stepped motion reads as digital, smooth reads as wobble. */
const REROLL_MS = 90;

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

	/**
	 * Randomization is the caller's job — the shader is deterministic data-in,
	 * pixels-out. Bands partition the y axis and tear along x (horizontal=false).
	 */
	#rollBands(): void {
		const height = this.app.renderer.height;
		const maxTear = this.glitch.intensity * this.app.renderer.width;
		this.#numBands = Math.min(3 + Math.floor(Math.random() * (this.glitch.bands - 2)), MAX_BANDS);
		for (let i = 0; i < this.#numBands; i++) {
			const start = Math.random() * height;
			const bandHeight = 6 + Math.random() * 50;
			const tear = (Math.random() * 2 - 1) * maxTear;
			this.#bandTable[i * 3] = start;
			this.#bandTable[i * 3 + 1] = start + bandHeight;
			this.#bandTable[i * 3 + 2] = tear;
		}
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
			this.#rollBands();
		}
		this.uniforms.bands = this.#bandTable;
		this.uniforms.numBands = this.#numBands;
		this.uniforms.horizontal = false;
		this.uniforms.aberrationPx = this.glitch.intensity * this.app.renderer.width * 0.15;
		this.uniforms.tint = this.glitch.tint;
		super.apply(filterManager, input, output, clearMode);
	}
}
