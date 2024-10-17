import type { SplashAPI } from "./api/api.js";

declare global {
  module "*.glsl" {
    const value: string;
    export default value;
  }
  interface Module {
    api: SplashAPI;
  }
}
