import type {
	AnimationInitialized,
	ButtonSpriteInitialized,
	ImageSpriteInitialized,
	SpriteInitialized,
	StateInitialized,
} from '../datamodel/SplashModel.ts';
import type { RenderedSprite, SplashRenderer } from './SplashRenderer.ts';
import { SplashAPI } from '../api/api.ts';
import { transitionState } from '../pixi/transitionState.ts';

class PixiRenderedSprite implements RenderedSprite {
	constructor(
		readonly object: PIXI.DisplayObject,
		readonly stage: PIXI.Container,
	) {}

	transition(state: StateInitialized): void {
		transitionState(this.object, state);
	}

	destroy(): void {
		this.object.destroy();
		this.stage.removeChild(this.object);
	}
}

/** WebGL splash renderer: draws sprites on a PIXI stage, supports shader animations. */
export class PixiRenderer implements SplashRenderer {
	#app: PIXI.Application;
	#api = SplashAPI.getInstance();
	#resizeObserver: ResizeObserver | undefined;

	constructor(view: HTMLCanvasElement) {
		// Sized to the host container so the renderer works fullscreen and in handout
		// windows; the observer also covers the container not being laid out yet at
		// mount time and users resizing handout windows.
		const container = view.parentElement;
		this.#app = new PIXI.Application({
			view,
			backgroundAlpha: 0,
			width: container?.clientWidth || window.innerWidth,
			height: container?.clientHeight || window.innerHeight,
		});
		this.#app.stage.sortableChildren = true;
		this.#app.ticker.maxFPS = game?.canvas?.app?.ticker?.maxFPS ?? 60;
		if (container) {
			this.#resizeObserver = new ResizeObserver(() => {
				this.#app.renderer.resize(container.clientWidth, container.clientHeight);
			});
			this.#resizeObserver.observe(container);
		}
	}

	async preload(sprites: SpriteInitialized[]): Promise<void> {
		for (const sprite of sprites.filter(s => s.type === 'image')) {
			await PIXI.Assets.load((sprite as ImageSpriteInitialized).img);
		}
		for (const sprite of sprites.filter(s => s.type === 'button')) {
			const button = sprite as ButtonSpriteInitialized;
			for (const image of [button.image?.url, button.hoverImage?.url, button.clickImage?.url]) {
				if (image) await PIXI.Assets.load(image);
			}
		}
	}

	async addSprite(
		sprite: SpriteInitialized,
		state: StateInitialized,
		animIn?: AnimationInitialized | null,
	): Promise<RenderedSprite | undefined> {
		const object = await this.#api.buildSprite(sprite, state);
		if (!object) return undefined;
		if (animIn) {
			await this.#api.buildAnimation(animIn, object, this.#app);
		}
		this.#app.stage.addChild(object);
		return new PixiRenderedSprite(object, this.#app.stage);
	}

	async animate(animation: AnimationInitialized, sprite: RenderedSprite): Promise<void> {
		if (sprite instanceof PixiRenderedSprite) {
			await this.#api.buildAnimation(animation, sprite.object, this.#app);
		}
	}

	animationDuration(animation: AnimationInitialized | null | undefined): number {
		return animation ? (animation.delay ?? 0) + (animation.duration ?? 3000) : 0;
	}

	destroy(): void {
		this.#resizeObserver?.disconnect();
		this.#app.stop();
		this.#app.stage.destroy();
	}
}
