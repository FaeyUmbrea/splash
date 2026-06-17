import type { ScanlinesEffectInitialized } from '../../datamodel/SplashModel.ts';
import vertexShader from '../common/vertex.glsl';
import fragmentShader from './static.glsl';

/** Persistent CRT scanlines for a single sprite. */
export default function StaticScanlinesFilter(
	app: PIXI.Application,
	effect: ScanlinesEffectInitialized,
): StaticScanlines {
	const color = foundry.utils.Color.from(effect.lineColor ?? '#000000');
	return new StaticScanlines(app, effect.intensity ?? 0.3, effect.thickness ?? 4, [color.r, color.g, color.b], effect.steps ?? 1);
}

export class StaticScanlines extends PIXI.Filter {
	constructor(
		public app: PIXI.Application,
		public intensity: number,
		public thickness: number,
		public lineColor: [number, number, number],
		public steps: number,
	) {
		super(vertexShader, fragmentShader);
	}

	override apply(
		filterManager: PIXI.FilterSystem,
		input: PIXI.RenderTexture,
		output: PIXI.RenderTexture,
		clearMode?: PIXI.CLEAR_MODES,
	) {
		this.uniforms.intensity = this.intensity;
		this.uniforms.thickness = this.thickness;
		this.uniforms.lineColor = this.lineColor;
		this.uniforms.steps = this.steps;
		filterManager.applyFilter(this, input, output, clearMode);
	}
}
