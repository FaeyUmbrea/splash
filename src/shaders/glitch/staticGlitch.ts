import type { GlitchEffectInitialized } from '../../datamodel/SplashModel.ts';
import vertexShader from '../common/vertex.glsl';
import { MAX_BANDS, REROLL_MS, rollBands } from './bands.ts';
import fragmentShader from './static.glsl';

/** Persistent glitchiness for a single sprite: the shader lib at constant strength. */
export default function StaticGlitchFilter(
	app: PIXI.Application,
	effect: GlitchEffectInitialized,
): StaticGlitch {
	const tint = foundry.utils.Color.from(effect.tint ?? '#0044ff');
	return new StaticGlitch(app, {
		bands: effect.bands ?? 8,
		intensity: effect.intensity ?? 0.01,
		tint: [tint.r, tint.g, tint.b],
	});
}

interface StaticGlitchSettings {
	bands: number;
	intensity: number;
	tint: [number, number, number];
}

export class StaticGlitch extends PIXI.Filter {
	#lastRoll = 0;
	#bandTable = new Float32Array(MAX_BANDS * 3);
	#numBands = 0;

	constructor(
		public app: PIXI.Application,
		public settings: StaticGlitchSettings,
	) {
		super(vertexShader, fragmentShader);
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
				this.settings.intensity * this.app.renderer.width,
				this.settings.bands,
			);
		}
		this.uniforms.bands = this.#bandTable;
		this.uniforms.numBands = this.#numBands;
		this.uniforms.horizontal = false;
		this.uniforms.aberrationPx = this.settings.intensity * this.app.renderer.width * 0.3;
		this.uniforms.tint = this.settings.tint;
		filterManager.applyFilter(this, input, output, clearMode);
	}
}
