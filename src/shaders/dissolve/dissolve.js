import fragmentShader from "./fragment.glsl";
import vertexShader from "../common/vertex.glsl";
import { getNoiseMaterial } from "../materials.js";

export default async function DissolveFilter(app) {
  return new Dissolve([0, 0], await getNoiseMaterial(), app);
}

export class Dissolve extends PIXI.Filter {
  constructor(origin, noise, app) {
    super(vertexShader, fragmentShader);
    this.origin = origin;
    this.noise = noise;
    this.app = app;
  }

  apply(filterManager, input, output, clearMode) {
    if (!this.started) {
      this.started = Date.now();
    }
    this.uniforms.time = Date.now() - this.started;
    this.uniforms.effectOrigin = this.origin;
    this.uniforms.noise = this.noise;
    this.uniforms.worldTransform =
      this.app.stage.worldTransform ?? new PIXI.Matrix();
    filterManager.applyFilter(this, input, output, clearMode);
  }
}
