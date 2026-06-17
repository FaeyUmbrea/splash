import type { PixelateEffectInitialized } from '../../datamodel/SplashModel.ts';
import vertexShader from '../common/vertex.glsl';
import fragmentShader from './static.glsl';

/** Persistent pixelation for a single sprite: the shader lib at a constant cell size. */
export default function StaticPixelateFilter(
	app: PIXI.Application,
	effect: PixelateEffectInitialized,
): StaticPixelate {
	return new StaticPixelate(app, effect.blockX ?? 8, effect.blockY ?? 8, effect.offsetX ?? 0, effect.offsetY ?? 0);
}

export class StaticPixelate extends PIXI.Filter {
	constructor(
		public app: PIXI.Application,
		public blockX: number,
		public blockY: number,
		public offsetX: number,
		public offsetY: number,
	) {
		super(vertexShader, fragmentShader);
	}

	override apply(
		filterManager: PIXI.FilterSystem,
		input: PIXI.RenderTexture,
		output: PIXI.RenderTexture,
		clearMode?: PIXI.CLEAR_MODES,
	) {
		// kernel must stay >= 1px or the reduction loop has no samples to average.
		this.uniforms.kernel = [Math.max(1, this.blockX), Math.max(1, this.blockY)];
		this.uniforms.offset = [this.offsetX, this.offsetY];
		filterManager.applyFilter(this, input, output, clearMode);
	}
}
