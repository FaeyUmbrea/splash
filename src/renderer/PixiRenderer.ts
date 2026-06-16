import type {
	AnimationInitialized,
	ButtonSpriteInitialized,
	DraggableSpriteInitialized,
	DropZoneSpriteInitialized,
	GaugeSpriteInitialized,
	ImageSpriteInitialized,
	SpriteInitialized,
	StateInitialized,
	TextInputSpriteInitialized,
} from '../datamodel/SplashModel.ts';
import type GaugeGraphics from '../pixi/gaugeGraphics.ts';
import type { RenderedSprite, SplashRenderer, SplashValues, SpriteContext, SpriteOverrides } from './SplashRenderer.ts';
import { SplashAPI } from '../api/api.ts';
import { transitionState } from '../pixi/transitionState.ts';
import { interpolate } from '../utils/interpolate.ts';
import { DragBehavior } from './dragController.ts';

/** Place a DOM overlay on the host from a sprite state; the PIXI stage is 1:1 with the host, so coords map to pixels. */
function placeOverlay(el: HTMLElement, state: StateInitialized): void {
	el.style.left = `${state.x ?? 0}px`;
	el.style.top = `${state.y ?? 0}px`;
	el.style.width = `${state.width ?? 100}px`;
	el.style.height = `${state.height ?? 100}px`;
	el.style.zIndex = String(state.zIndex ?? 0);
}

class PixiRenderedSprite implements RenderedSprite {
	#values: SplashValues = {};
	#overrides: SpriteOverrides = {};

	constructor(
		readonly object: PIXI.DisplayObject,
		readonly stage: PIXI.Container,
		readonly sprite: SpriteInitialized,
	) {}

	transition(state: StateInitialized): void {
		transitionState(this.object, state);
	}

	updateValues(values: SplashValues): void {
		this.#values = values;
		this.#refresh();
	}

	applyOverrides(overrides: SpriteOverrides): void {
		this.#overrides = overrides;
		this.#refresh();
	}

	#refresh(): void {
		if (this.sprite.type === 'text') {
			const override = this.#overrides.text;
			(this.object as PIXI.Text).text = override != null ? String(override) : interpolate(this.sprite.text ?? '', this.#values);
		} else if (this.sprite.type === 'gauge') {
			const gauge = this.sprite as GaugeSpriteInitialized;
			const min = gauge.min ?? 0;
			const max = gauge.max ?? 100;
			const raw = Number(this.#values[gauge.valueKey ?? ''] ?? 0);
			const fraction = Math.min(Math.max((raw - min) / ((max - min) || 1), 0), 1);
			(this.object as GaugeGraphics).setFraction(fraction);
		}
	}

	destroy(): void {
		this.object.destroy();
		this.stage.removeChild(this.object);
	}
}

// PIXI cannot render an editable field, so text-input sprites overlay a real DOM input on the canvas host.
class DomInputSprite implements RenderedSprite {
	readonly #input: HTMLInputElement;

	constructor(
		readonly host: HTMLElement,
		readonly sprite: TextInputSpriteInitialized,
		state: StateInitialized,
		context: SpriteContext,
	) {
		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = sprite.placeholder ?? '';
		input.style.position = 'absolute';
		input.style.boxSizing = 'border-box';
		input.style.padding = '0 8px';
		input.style.border = '0';
		input.style.outline = 'none';
		input.style.fontSize = sprite.fontSize ? `${sprite.fontSize}px` : '';
		input.style.color = sprite.color ?? '';
		input.style.background = sprite.bgColor ?? '';
		input.addEventListener('input', () => {
			void context.onAction({ type: 'set-value', key: sprite.valueKey ?? '', value: input.value });
		});
		this.#input = input;
		host.appendChild(input);
		this.transition(state);
	}

	// The runtime PIXI stage is 1:1 with the host (no scaling), so state coords map directly to pixels.
	transition(state: StateInitialized): void {
		this.#input.style.left = `${state.x ?? 0}px`;
		this.#input.style.top = `${state.y ?? 0}px`;
		this.#input.style.width = `${state.width ?? 240}px`;
		this.#input.style.height = `${state.height ?? 40}px`;
		this.#input.style.zIndex = String(state.zIndex ?? 0);
	}

	updateValues(values: SplashValues): void {
		// Skip while focused so the live value does not fight the user's cursor.
		if (this.#input === document.activeElement) return;
		this.#input.value = String(values[this.sprite.valueKey ?? ''] ?? '');
	}

	applyOverrides(): void {}

	destroy(): void {
		this.#input.remove();
	}
}

// A drop zone is geometry, not WebGL: a DOM overlay so draggables (also overlays) can hit-test it across renderers.
class DropZoneDomSprite implements RenderedSprite {
	readonly #el: HTMLDivElement;

	constructor(host: HTMLElement, sprite: DropZoneSpriteInitialized, state: StateInitialized) {
		const el = document.createElement('div');
		el.style.position = 'absolute';
		el.style.boxSizing = 'border-box';
		el.dataset.splashDropzone = 'true';
		el.dataset.zoneId = sprite.id;
		el.dataset.accepts = sprite.accepts ?? '';
		el.dataset.highlight = sprite.highlightColor || '#4caf50';
		el.style.background = sprite.fill || 'transparent';
		el.style.border = sprite.borderWidth ? `${sprite.borderWidth}px solid ${sprite.borderColor || '#fff'}` : 'none';
		el.style.borderRadius = `${sprite.radius ?? 0}px`;
		this.#el = el;
		host.appendChild(el);
		this.transition(state);
	}

	transition(state: StateInitialized): void {
		placeOverlay(this.#el, state);
	}

	updateValues(): void {}
	applyOverrides(): void {}

	destroy(): void {
		this.#el.remove();
	}
}

// PIXI cannot drive a freely-dragged piece, so draggables overlay a DOM element and share the renderer-agnostic DragBehavior.
class DraggableDomSprite implements RenderedSprite {
	readonly #el: HTMLDivElement;
	readonly #behavior: DragBehavior;
	readonly #valueKey: string;
	#occupied = '';

	constructor(host: HTMLElement, sprite: DraggableSpriteInitialized, state: StateInitialized, context: SpriteContext) {
		const el = document.createElement('div');
		el.style.position = 'absolute';
		el.style.boxSizing = 'border-box';
		el.style.backgroundColor = sprite.fill || 'transparent';
		if (sprite.img) {
			el.style.backgroundImage = `url("${sprite.img}")`;
			el.style.backgroundSize = 'contain';
			el.style.backgroundRepeat = 'no-repeat';
			el.style.backgroundPosition = 'center';
		}
		el.style.borderRadius = `${sprite.radius ?? 0}px`;
		this.#el = el;
		this.#valueKey = sprite.valueKey ?? '';
		host.appendChild(el);
		this.#behavior = new DragBehavior(el, host, {
			tag: sprite.tag ?? '',
			onDrop: zone => void context.onAction({ type: 'drop', zone }),
		});
		this.transition(state);
	}

	transition(state: StateInitialized): void {
		placeOverlay(this.#el, state);
		this.#behavior.settle(this.#occupied);
	}

	updateValues(values: SplashValues): void {
		this.#occupied = String(values[this.#valueKey] ?? '');
		this.#behavior.settle(this.#occupied);
	}

	applyOverrides(): void {}

	destroy(): void {
		this.#behavior.destroy();
		this.#el.remove();
	}
}

export class PixiRenderer implements SplashRenderer {
	#app: PIXI.Application;
	#api = SplashAPI.getInstance();
	#resizeObserver: ResizeObserver | undefined;
	#host: HTMLElement;

	constructor(view: HTMLCanvasElement) {
		const container = view.parentElement;
		this.#host = container ?? document.body;
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
		const urls: string[] = [];
		for (const sprite of sprites) {
			if (sprite.type === 'image') {
				urls.push((sprite as ImageSpriteInitialized).img);
			} else if (sprite.type === 'button') {
				const button = sprite as ButtonSpriteInitialized;
				urls.push(button.image?.url, button.hoverImage?.url, button.clickImage?.url);
			}
		}
		// Skip blanks and never let one missing asset abort the whole splash (matches the HTML renderer's tolerance).
		for (const url of urls) {
			if (!url) continue;
			try {
				await PIXI.Assets.load(url);
			} catch (error) {
				console.warn(`Splash | failed to preload ${url}`, error);
			}
		}
	}

	async addSprite(
		sprite: SpriteInitialized,
		state: StateInitialized,
		animIn: AnimationInitialized | null | undefined,
		context: SpriteContext,
	): Promise<RenderedSprite | undefined> {
		// No PIXI object: these types overlay DOM elements on the host instead of going through buildSprite.
		if (sprite.type === 'text-input') {
			return new DomInputSprite(this.#host, sprite as TextInputSpriteInitialized, state, context);
		}
		if (sprite.type === 'drop-zone') {
			return new DropZoneDomSprite(this.#host, sprite as DropZoneSpriteInitialized, state);
		}
		if (sprite.type === 'draggable') {
			return new DraggableDomSprite(this.#host, sprite as DraggableSpriteInitialized, state, context);
		}
		const object = await this.#api.buildSprite(sprite, state, context);
		if (!object) return undefined;
		if (animIn) {
			await this.#api.buildAnimation(animIn, object, this.#app);
		}
		for (const effect of sprite.effects ?? []) {
			if (!effect) continue;
			const filter = await this.#api.buildEffect(this.#app, effect);
			if (filter) object.filters = [...(object.filters ?? []), filter];
		}
		this.#app.stage.addChild(object);
		return new PixiRenderedSprite(object, this.#app.stage, sprite);
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
		// Destroy the whole Application to release the WebGL context (browsers cap ~16). removeView:false leaves the canvas for Svelte.
		this.#app.destroy(false, { children: true });
	}
}
