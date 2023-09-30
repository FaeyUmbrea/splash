import fragmentShader from "./fragment.glsl";
import vertexShader from "../common/vertex.glsl";
import { getNoiseMaterial } from "../materials.js";

export default async function InverseDissolveFilter() {
  return new InverseDissolve([0.5, 0.5], await getNoiseMaterial());
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
