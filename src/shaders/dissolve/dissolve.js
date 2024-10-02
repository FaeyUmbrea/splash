import fragmentShader from "./fragment.glsl";
import vertexShader from "../common/vertex.glsl";
import { getNoiseMaterial } from "../materials.js";

export default async function DissolveFilter(
  app,
  origins = [1000, 1000],
  invert = false,
  randomOrigins = false,
  numOrigins = 2,
) {
  if (randomOrigins) {
    origins = [];
    for (let i = 0; i < Math.min(numOrigins, 16); i++) {
      origins.push(
        Math.random() * app.renderer.width,
        Math.random() * app.renderer.height,
      );
    }
  }
  return new Dissolve(origins, await getNoiseMaterial(), invert, app);
}

export class Dissolve extends PIXI.Filter {
  constructor(origins, noise, invert, app) {
    super(vertexShader, fragmentShader);
    this.origins = origins;
    this.noise = noise;
    this.app = app;
    this.invert = invert;
  }

  apply(filterManager, input, output, clearMode) {
    if (!this.started) {
      this.started = Date.now();
    }
    this.uniforms.numOrigins = this.origins.length / 2;
    this.uniforms.time = Date.now() - this.started;
    this.uniforms.effectOrigins = this.origins;
    this.uniforms.noise = this.noise;
    this.uniforms.invert = this.invert;
    this.uniforms.worldTransform =
      this.app.stage.worldTransform ?? new PIXI.Matrix();
    filterManager.applyFilter(this, input, output, clearMode);
  }
}
