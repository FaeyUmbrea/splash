import type { SplashAPI } from '../api/api.js';
import type {
	AnimationInitialized,
	ButtonSpriteInitialized,
	ChangeStateActionInitialized,
	GaugeSpriteInitialized,
	HotspotSpriteInitialized,
	ImageSpriteInitialized,
	MacroActionInitialized,
	PanelSpriteInitialized,
	State,
	TextSpriteInitialized,
	VideoSpriteInitialized,
} from '../datamodel/SplashModel.ts';
import type { SpriteContext } from '../renderer/SplashRenderer.ts';
import type { DissolveFilterProps } from '../shaders/dissolve/dissolve.js';
import GaugeGraphics from '../pixi/gaugeGraphics.js';
import NineSlicePlaneButton from '../pixi/nineSlicePlaneButton.js';
import PanelGraphics from '../pixi/panelGraphics.js';
import { transitionState } from '../pixi/transitionState.ts';
import DissolveFilter from '../shaders/dissolve/dissolve.js';
import GlitchFilter from '../shaders/glitch/glitch.ts';
import StaticGlitchFilter from '../shaders/glitch/staticGlitch.ts';

export function setupAPI(api: SplashAPI) {
	api.registerAnimation('dissolve', 'Dissolve Animation', instantiateDissolve);
	api.registerAnimation('glitch', 'Glitch Transition', instantiateGlitch);
	api.registerEffect('glitch', 'Glitch', (app, effect) => StaticGlitchFilter(app, effect));
	api.registerSprite('text', 'Text', instantiateText);
	api.registerSprite('image', 'Image', instantiateImage);
	api.registerSprite('button', 'Button', instantiateButton);
	api.registerSprite('panel', 'Panel', instantiatePanel);
	api.registerSprite('gauge', 'Gauge', instantiateGauge);
	api.registerSprite('hotspot', 'Hotspot', instantiateHotspot);
	api.registerSprite('video', 'Video', instantiateVideo);
	api.registerAction('macro', 'Macro', executeMacro);
	api.registerAction('change-state', 'Change State', changeState);
	api.registerAction('close', 'Close Splash', () => {
		Hooks.call('splash.close-splash');
	});
	// Real handlers live per-runtime; this stub only registers the action so editors can list it.
	const valueActionWarning = () => console.warn('Splash | Value actions only work inside a running splash.');
	api.registerAction('set-value', 'Set Value', valueActionWarning);
	api.registerAction('increment-value', 'Increment Value', valueActionWarning);
}

async function instantiateDissolve(
	animation: AnimationInitialized,
	sprite: PIXI.DisplayObject,
	app: PIXI.Application,
) {
	const animClass = await DissolveFilter(
		app,
		animation?.props as DissolveFilterProps,
	);

	if (animClass) {
		setTimeout(() => {
			if (!sprite.filters) {
				sprite.filters = [];
			}
			sprite.filters.push(animClass);
			setTimeout(() => {
				if (sprite.filters) {
					sprite.filters.splice(
						sprite.filters.findIndex(item => item === animClass),
					);
				}
			}, animation?.duration ?? 3000);
		}, animation?.delay ?? 0);
	}
}

async function instantiateGlitch(
	animation: AnimationInitialized,
	sprite: PIXI.DisplayObject,
	app: PIXI.Application,
) {
	if (animation.type !== 'glitch') return;
	const filter = await GlitchFilter(app, animation);
	setTimeout(() => {
		sprite.filters = [...(sprite.filters ?? []), filter];
		setTimeout(() => {
			if (sprite.filters) {
				sprite.filters = sprite.filters.filter(item => item !== filter);
			}
		}, animation.duration ?? 3000);
	}, animation.delay ?? 0);
}

async function instantiateImage(image: ImageSpriteInitialized, state: State, _context: SpriteContext) {
	if (image.type !== 'image') throw new Error('Image type is not \'image\'');

	// An unset source must not throw (PIXI.Sprite.from('') does); an empty placeholder keeps the splash rendering.
	const sprite = image.img ? PIXI.Sprite.from(image.img) : new PIXI.Sprite(PIXI.Texture.EMPTY);
	transitionState(sprite, state);
	return sprite;
}

async function instantiateText(text: TextSpriteInitialized, state: State, _context: SpriteContext) {
	if (text.type !== 'text') throw new Error('Text type is not \'text\'');
	const sprite = new PIXI.Text(text.text, {
		fontFamily: text.font,
		fontSize: text.size ?? 34,
		fill: text.fillColor,
		align: text.align,
	});
	transitionState(sprite, state);
	return sprite;
}

async function instantiatePanel(panel: PanelSpriteInitialized, state: State, _context: SpriteContext) {
	if (panel.type !== 'panel') throw new Error('Panel type is not \'panel\'');
	const graphics = new PanelGraphics({
		fill: panel.fill,
		borderColor: panel.borderColor,
		borderWidth: panel.borderWidth,
		radius: panel.radius,
	});
	transitionState(graphics, state);
	return graphics;
}

async function instantiateGauge(gauge: GaugeSpriteInitialized, state: State, _context: SpriteContext) {
	if (gauge.type !== 'gauge') throw new Error('Gauge type is not \'gauge\'');
	const graphics = new GaugeGraphics({
		fillColor: gauge.fillColor,
		bgColor: gauge.bgColor,
		vertical: gauge.vertical,
	});
	transitionState(graphics, state);
	return graphics;
}

async function instantiateHotspot(hotspot: HotspotSpriteInitialized, state: State, context: SpriteContext) {
	if (hotspot.type !== 'hotspot') throw new Error('Hotspot type is not \'hotspot\'');
	// A transparent, hit-testable rectangle: no fill, but a drawn shape so the hit area exists.
	const graphics = new PIXI.Graphics();
	graphics.beginFill(0, 0.0001);
	graphics.drawRect(0, 0, state.width ?? 200, state.height ?? 200);
	graphics.endFill();
	graphics.eventMode = 'static';
	graphics.cursor = 'pointer';
	graphics.on('pointertap', () => {
		// Routed through the owning runtime to stay instance-scoped.
		void context.onAction(hotspot.onClick);
	});
	transitionState(graphics, state);
	return graphics;
}

async function instantiateVideo(video: VideoSpriteInitialized, state: State, _context: SpriteContext) {
	if (video.type !== 'video') throw new Error('Video type is not \'video\'');
	// An unset source must not throw; an empty placeholder keeps the splash rendering.
	const texture = video.src
		? PIXI.Texture.from(video.src, {
				resourceOptions: {
					autoPlay: video.autoplay ?? true,
					muted: video.muted ?? true,
					loop: video.loop ?? true,
				},
			})
		: PIXI.Texture.EMPTY;
	const sprite = new PIXI.Sprite(texture);
	transitionState(sprite, state);
	return sprite;
}

async function instantiateButton(button: ButtonSpriteInitialized, state: State, context: SpriteContext) {
	if (button.type !== 'button') throw new Error('Button type is not \'button\'');

	const buttonConfig = foundry.utils.mergeObject(button, {
		onTap: async () => {
			// Routed through the owning runtime to stay instance-scoped.
			await context.onAction(button.onClick);
		},
	});
	const sprite = new NineSlicePlaneButton(buttonConfig);

	transitionState(sprite, state);
	return sprite;
}

function executeMacro(action: MacroActionInitialized) {
	action.macro?.execute();
}

function changeState(action: ChangeStateActionInitialized) {
	Hooks.call('splash.change-states', action);
}
