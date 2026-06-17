import type { CurvatureEffectInitialized } from '../../datamodel/SplashModel.ts';
import vertexShader from '../common/vertex.glsl';
import fragmentShader from './static.glsl';

/** Persistent CRT barrel curvature for a single sprite. */
export default function StaticCurvatureFilter(
	app: PIXI.Application,
	effect: CurvatureEffectInitialized,
): StaticCurvature {
	return new StaticCurvature(app, effect.strength ?? 0.1, effect.start ?? 0.8, effect.end ?? 2);
}

export class StaticCurvature extends PIXI.Filter {
	constructor(
		public app: PIXI.Application,
		public strength: number,
		public start: number,
		public end: number,
	) {
		super(vertexShader, fragmentShader);
	}

	override apply(
		filterManager: PIXI.FilterSystem,
		input: PIXI.RenderTexture,
		output: PIXI.RenderTexture,
		clearMode?: PIXI.CLEAR_MODES,
	) {
		this.uniforms.strength = this.strength;
		this.uniforms.start = this.start;
		this.uniforms.end = this.end;
		filterManager.applyFilter(this, input, output, clearMode);
	}
}
