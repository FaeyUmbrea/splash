import type { PixelateAnimationInitialized } from '../../datamodel/SplashModel.ts';
import { Dissolve, originsFromProps } from '../dissolve/dissolve.ts';
import { getNoiseMaterial } from '../materials.js';
import fragmentShader from './fragment.glsl';

/** Structurally a dissolve: same origin-driven reveal, but the border zone is pixelated. */
export default async function PixelateFilter(
	app: PIXI.Application,
	animation: PixelateAnimationInitialized,
): Promise<Pixelate> {
	const props = animation.props as { origins?: unknown; block?: number; invert?: boolean };
	return new Pixelate(
		originsFromProps(app, (props?.origins ?? { type: 'randomOrigins', randomOrigins: true, numOrigins: 2 }) as any),
		await getNoiseMaterial(),
		props?.invert ?? false,
		app,
		props?.block ?? 32,
	);
}

export class Pixelate extends Dissolve {
	constructor(
		origins: number[],
		noise: PIXI.Texture,
		invert: boolean,
		app: PIXI.Application,
		public block: number,
	) {
		super(origins, noise, invert, app, fragmentShader);
	}

	override apply(
		filterManager: PIXI.FilterSystem,
		input: PIXI.RenderTexture,
		output: PIXI.RenderTexture,
		clearMode?: PIXI.CLEAR_MODES,
	) {
		this.uniforms.blockSize = this.block;
		super.apply(filterManager, input, output, clearMode);
	}
}
