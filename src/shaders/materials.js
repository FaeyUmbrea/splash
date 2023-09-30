let noise;

export async function getNoiseMaterial() {
  if (!noise) {
    noise = await PIXI.Assets.load("/modules/splash/noise.png");
    noise.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    noise.baseTexture.mipmap = false;
  }
  return noise;
}
