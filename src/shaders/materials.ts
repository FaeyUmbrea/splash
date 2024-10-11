import { MIPMAP_MODES } from "@pixi/constants";

let noise: PIXI.Texture;

export async function getNoiseMaterial(): Promise<PIXI.Texture> {
  if (!noise) {
    noise = await PIXI.Assets.load("/modules/splash/noise.png");
    noise.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    noise.baseTexture.mipmap = MIPMAP_MODES.OFF;
  }
  return noise;
}
