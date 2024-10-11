import fragmentShader from "./fragment.glsl";
import vertexShader from "../common/vertex.glsl";
import { getNoiseMaterial } from "../materials.js";

export interface DissolveFilterProps {
  origins: number[];
  invert: boolean;
  randomOrigins: boolean;
  numOrigins: number;
}

export default async function DissolveFilter(
  app: PIXI.Application,
  props: DissolveFilterProps,
): Promise<Dissolve> {
  props = foundry.utils.mergeObject(
    {
      origins: [1000, 1000],
      invert: false,
      randomOrigins: false,
      numOrigins: 2,
    },
    props,
  );
  if (props.randomOrigins) {
    for (let i = 0; i < Math.min(props.numOrigins, 16); i++) {
      props.origins.push(
        Math.random() * app.renderer.width,
        Math.random() * app.renderer.height,
      );
    }
  } else {
    props.origins.push(...props.origins);
  }
  return new Dissolve(
    props.origins,
    await getNoiseMaterial(),
    props.invert,
    app,
  );
}

export class Dissolve extends PIXI.Filter {
  private started?: number;

  constructor(
    public origins: number[],
    public noise: PIXI.Texture,
    public invert: boolean,
    public app: PIXI.Application,
  ) {
    super(vertexShader, fragmentShader);
  }

  override apply(
    filterManager: PIXI.FilterSystem,
    input: PIXI.RenderTexture,
    output: PIXI.RenderTexture,
    clearMode?: PIXI.CLEAR_MODES,
  ) {
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
