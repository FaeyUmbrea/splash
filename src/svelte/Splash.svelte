<svelte:options accessors="{true}" />

<script>
  import { onMount } from "svelte";
  import DissolveFilter from "../shaders/dissolve/dissolve.js";

  export let elementRoot = void 0;

  export let img =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Delicious_apples.jpg/500px-Golden_Delicious_apples.jpg";
  export let effect;

  let app, view;
  onMount(async () => {
    app = new PIXI.Application({
      view,
      backgroundAlpha: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const sprite = PIXI.Sprite.from(img);
    console.error(window.innerHeight);
    console.error(window.innerWidth);
    console.error(sprite);
    sprite.x = window.innerWidth / 2 - sprite.texture.orig.width / 2;
    sprite.y = window.innerHeight / 2 - sprite.texture.orig.height / 2;
    //sprite.width = window.innerWidth;
    //sprite.height = window.innerHeight;
    sprite.filters = [];
    sprite.filters.push(await DissolveFilter());
    app.stage.addChild(sprite);
  });
</script>

<div bind:this="{elementRoot}">
  <canvas bind:this="{view}"></canvas>
</div>

<style lang="stylus">
  div
    z-index 2
    position absolute
    width 100vw
    height 100vh
</style>
