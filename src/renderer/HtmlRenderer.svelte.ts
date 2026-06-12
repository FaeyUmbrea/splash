import type {
	AnimationInitialized,
	ButtonSpriteInitialized,
	ImageSpriteInitialized,
	SpriteInitialized,
	StateInitialized,
} from '../datamodel/SplashModel.ts';
import type { RenderedSprite, SplashRenderer, SplashValues, SpriteContext } from './SplashRenderer.ts';
import * as svelte from 'svelte';
import BaseSprite from '../svelte/components/BaseSprite.svelte';
import { spriteComponents } from '../svelte/components/index.ts';

interface HtmlSpriteProps {
	sprite: SpriteInitialized;
	state: StateInitialized;
	component: svelte.Component<any>;
	values: SplashValues;
	context: SpriteContext;
}

class HtmlRenderedSprite implements RenderedSprite {
	#mounted: object;
	#props: HtmlSpriteProps;
	#destroyed = false;

	constructor(target: HTMLElement, sprite: SpriteInitialized, state: StateInitialized, component: svelte.Component<any>, context: SpriteContext) {
		this.#props = $state({ sprite, state, component, values: {}, context });
		this.#mounted = svelte.mount(BaseSprite, { target, props: this.#props });
	}

	transition(state: StateInitialized): void {
		this.#props.state = state;
	}

	updateValues(values: SplashValues): void {
		this.#props.values = { ...values };
	}

	destroy(): void {
		if (this.#destroyed) return;
		this.#destroyed = true;
		svelte.unmount(this.#mounted);
	}
}

/** Plain HTML splash renderer for weak machines: DOM sprites, full interactivity, no GL effects. */
export class HtmlRenderer implements SplashRenderer {
	#target: HTMLElement;
	// Plain Set on purpose: teardown bookkeeping only, never rendered.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#sprites: Set<HtmlRenderedSprite> = new Set();

	constructor(target: HTMLElement) {
		this.#target = target;
	}

	async preload(sprites: SpriteInitialized[]): Promise<void> {
		const urls: string[] = [];
		for (const sprite of sprites) {
			if (sprite.type === 'image') {
				urls.push((sprite as ImageSpriteInitialized).img);
			} else if (sprite.type === 'button') {
				const button = sprite as ButtonSpriteInitialized;
				urls.push(...[button.image?.url, button.hoverImage?.url, button.clickImage?.url].filter(Boolean) as string[]);
			}
		}
		await Promise.all(urls.map(url => new Promise((resolve) => {
			const image = new Image();
			image.onload = resolve;
			image.onerror = resolve;
			image.src = url;
		})));
	}

	async addSprite(
		sprite: SpriteInitialized,
		state: StateInitialized,
		_animIn: AnimationInitialized | null | undefined,
		context: SpriteContext,
	): Promise<RenderedSprite | undefined> {
		const component = spriteComponents[sprite.type];
		if (!component) {
			console.warn(`Splash | No HTML renderer for sprite type ${sprite.type}. Did not create.`);
			return undefined;
		}
		const rendered = new HtmlRenderedSprite(this.#target, sprite, state, component, context);
		this.#sprites.add(rendered);
		return rendered;
	}

	async animate(_animation: AnimationInitialized, _sprite: RenderedSprite): Promise<void> {
		// Animations are GL-only effects; the HTML renderer shows state changes instantly.
	}

	animationDuration(_animation: AnimationInitialized | null | undefined): number {
		// Animations are skipped, so they never block state changes.
		return 0;
	}

	destroy(): void {
		for (const sprite of this.#sprites) {
			sprite.destroy();
		}
		this.#sprites.clear();
	}
}
