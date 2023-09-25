import fragmentShader from "./fragment.glsl";
import vertexShader from "./vertex.glsl";

let noise;

export default async function InverseDissolveFilter() {
  if (!noise) {
    noise = await PIXI.Assets.load("/modules/splash/noise.jpg");
    noise.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    noise.baseTexture.mipmap = false;
  }
  return new InverseDissolve([0.5, 0.5], noise);
}

export class InverseDissolve extends PIXI.Filter {
  constructor(origin, noise) {
    super(vertexShader, fragmentShader);
    this.origin = origin;
    this.noise = noise;
  }

  apply(filterManager, input, output, clearMode) {
    if (!this.started) {
      this.started = Date.now();
    }
    this.uniforms.time = (Date.now() - this.started - 10) / 5000;
    this.uniforms.effectOrigin = this.origin;
    this.uniforms.noise = this.noise;
    filterManager.applyFilter(this, input, output, clearMode);
  }
}
