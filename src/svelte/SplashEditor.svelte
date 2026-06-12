<svelte:options accessors={true} />

<script lang='ts'>

	import type { SplashInitialized } from '../datamodel/SplashModel.ts';

	export let elementRoot: HTMLDivElement | undefined = void 0;

	export let splashConfig: SplashInitialized;
</script>

<div class='splash-editor' bind:this={elementRoot}>
	<section class='title'>
		<h1>
			Splash Edit Mode
		</h1>
	</section>
	<button class='save'>
		<i class='fas fa-save'></i>
	</button>
	<button class='exit'>
		<i class='fas fa-x'></i>
	</button>
</div>

<style lang='scss'>
  .save {
    position: absolute;
    top: 10px;
    left: 45px;
    color: #fff;
    cursor: pointer;
  }
  .exit {
    position: absolute;
    top: 10px;
    left: 10px;
    color: #fff;
    cursor: pointer;
  }
  .title {
    padding-top: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .splash-editor {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: absolute;
    width: 100%;
    height: 100%;
    background: #00000080;
    z-index: 1000;
  }
</style>
