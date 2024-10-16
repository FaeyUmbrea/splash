import fragmentShader from "./fragment.glsl";
import vertexShader from "../common/vertex.glsl";
import { getNoiseMaterial } from "../materials.js";

interface BaseDissolveFilterProps {
  invert: boolean;
}

interface FixedOriginsDissolveFilterProps extends BaseDissolveFilterProps {
  origins: number[];
}

interface RandomOriginDissolveFilterProps extends BaseDissolveFilterProps {
  randomOrigins: boolean;
  numOrigins?: number;
}

export type DissolveFilterProps =
  | FixedOriginsDissolveFilterProps
  | RandomOriginDissolveFilterProps;

export default async function DissolveFilter(
  app: PIXI.Application,
  props: DissolveFilterProps,
): Promise<Dissolve> {
  const origins = [];
  if ("randomOrigins" in props) {
    for (let i = 0; i < Math.min(props.numOrigins ?? 2, 16); i++) {
      origins.push(
        Math.random() * app.renderer.width,
        Math.random() * app.renderer.height,
      );
    }
  } else {
    origins.push(...props.origins);
  }
  return new Dissolve(origins, await getNoiseMaterial(), props.invert, app);
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
