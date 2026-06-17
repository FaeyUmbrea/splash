import type { SplashAPI } from '../api/api.js';
import type {
	AnimationInitialized,
	ButtonSpriteInitialized,
	ChangeStateActionInitialized,
	CurvatureEffectInitialized,
	GaugeSpriteInitialized,
	GlitchEffectInitialized,
	HotspotSpriteInitialized,
	ImageSpriteInitialized,
	MacroActionInitialized,
	PanelSpriteInitialized,
	PixelateEffectInitialized,
	ScanlinesEffectInitialized,
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
import StaticCurvatureFilter from '../shaders/crt/staticCrt.ts';
import DissolveFilter from '../shaders/dissolve/dissolve.js';
import GlitchFilter from '../shaders/glitch/glitch.ts';
import StaticGlitchFilter from '../shaders/glitch/staticGlitch.ts';
import PixelateFilter from '../shaders/pixelate/pixelate.ts';
import StaticPixelateFilter from '../shaders/pixelate/staticPixelate.ts';
import StaticScanlinesFilter from '../shaders/scanlines/staticScanlines.ts';

export function setupAPI(api: SplashAPI) {
	// Names AND editor metadata (icon/defaults/fields) are registered here, so the editors render every
	// type straight from the API — first-party types use the exact same surface a third party would.
	// Labels are i18n KEYS, not localized strings: i18n isn't loaded yet at `init`, so the registry
	// getters localize them lazily at render time (plain third-party labels pass through unchanged).
	const randomOrigins = (n: number) => ({ type: 'randomOrigins', randomOrigins: true, numOrigins: n });

	api.registerAnimation('dissolve', 'splash.editor.animationEditor.typeDissolve', instantiateDissolve, {
		defaults: { type: 'dissolve', duration: 1000, delay: 0, props: randomOrigins(5) },
		fields: [],
	});
	api.registerAnimation('glitch', 'splash.editor.animationEditor.typeGlitch', instantiateGlitch, {
		defaults: { type: 'glitch', duration: 1000, delay: 0, props: { origins: randomOrigins(5), bands: 20, intensity: 0.05, tint: '#0044ff', invert: false } },
		fields: [
			{ type: 'number', key: 'bands', label: 'splash.editor.animationEditor.bands', group: 'g' },
			{ type: 'number', key: 'intensity', label: 'splash.editor.animationEditor.intensity', step: 0.01, group: 'g' },
			{ type: 'color', key: 'tint', label: 'splash.editor.animationEditor.tint' },
			{ type: 'checkbox', key: 'invert', label: 'splash.editor.animationEditor.invert' },
		],
	});
	api.registerAnimation('pixelate', 'splash.editor.animationEditor.typePixelate', instantiatePixelate, {
		defaults: { type: 'pixelate', duration: 1000, delay: 0, props: { origins: randomOrigins(5), block: 32, invert: false } },
		fields: [
			{ type: 'number', key: 'block', label: 'splash.editor.animationEditor.block' },
			{ type: 'checkbox', key: 'invert', label: 'splash.editor.animationEditor.invert' },
		],
	});

	api.registerEffect('glitch', 'splash.editor.effectsEditor.glitch', (app, effect) => StaticGlitchFilter(app, effect as GlitchEffectInitialized), {
		defaults: { bands: 8, intensity: 0.01, tint: '#0044ff' },
		fields: [
			{ type: 'number', key: 'bands', label: 'splash.editor.effectsEditor.bands', group: 'g' },
			{ type: 'number', key: 'intensity', label: 'splash.editor.effectsEditor.intensity', step: 0.01, group: 'g' },
			{ type: 'color', key: 'tint', label: 'splash.editor.effectsEditor.tint' },
		],
	});
	api.registerEffect('pixelate', 'splash.editor.effectsEditor.pixelate', (app, effect) => StaticPixelateFilter(app, effect as PixelateEffectInitialized), {
		defaults: { blockX: 8, blockY: 8, offsetX: 0, offsetY: 0 },
		fields: [
			{ type: 'number', key: 'blockX', label: 'splash.editor.effectsEditor.blockWidth', group: 'b' },
			{ type: 'number', key: 'blockY', label: 'splash.editor.effectsEditor.blockHeight', group: 'b' },
			{ type: 'number', key: 'offsetX', label: 'splash.editor.effectsEditor.offsetX', group: 'o' },
			{ type: 'number', key: 'offsetY', label: 'splash.editor.effectsEditor.offsetY', group: 'o' },
		],
	});
	api.registerEffect('curvature', 'splash.editor.effectsEditor.curvature', (app, effect) => StaticCurvatureFilter(app, effect as CurvatureEffectInitialized), {
		defaults: { strength: 0.1, start: 0.8, end: 2 },
		fields: [
			{ type: 'number', key: 'strength', label: 'splash.editor.effectsEditor.strength', step: 0.01 },
			{ type: 'number', key: 'start', label: 'splash.editor.effectsEditor.curveStart', step: 0.01, group: 'c' },
			{ type: 'number', key: 'end', label: 'splash.editor.effectsEditor.curveEnd', step: 0.01, group: 'c' },
		],
	});
	api.registerEffect('scanlines', 'splash.editor.effectsEditor.scanlines', (app, effect) => StaticScanlinesFilter(app, effect as ScanlinesEffectInitialized), {
		defaults: { intensity: 0.3, thickness: 4, lineColor: '#000000', steps: 1 },
		fields: [
			{ type: 'number', key: 'intensity', label: 'splash.editor.effectsEditor.intensity', step: 0.01, group: 's' },
			{ type: 'number', key: 'thickness', label: 'splash.editor.effectsEditor.thickness', group: 's' },
			{ type: 'color', key: 'lineColor', label: 'splash.editor.effectsEditor.lineColor' },
			{ type: 'number', key: 'steps', label: 'splash.editor.effectsEditor.steps' },
		],
	});

	api.registerSprite('text', 'Text', instantiateText);
	api.registerSprite('image', 'Image', instantiateImage);
	api.registerSprite('button', 'Button', instantiateButton);
	api.registerSprite('panel', 'Panel', instantiatePanel);
	api.registerSprite('gauge', 'Gauge', instantiateGauge);
	api.registerSprite('hotspot', 'Hotspot', instantiateHotspot);
	api.registerSprite('video', 'Video', instantiateVideo);

	api.registerAction('macro', 'splash.editor.actionEditor.typeMacro', executeMacro, {
		icon: 'fa-solid fa-scroll',
		defaults: { type: 'macro', macro: null },
		fields: [{ type: 'select', key: 'macro', source: 'macros', placeholder: 'splash.editor.actionEditor.pickMacro' }],
	});
	api.registerAction('change-state', 'splash.editor.actionEditor.typeChangeState', changeState, {
		icon: 'fa-solid fa-right-left',
		defaults: { type: 'change-state', load: [], unload: [], conditions: null },
		fields: [
			{ type: 'select', key: 'load', source: 'states', multiple: true, placeholder: 'splash.editor.actionEditor.loadStates' },
			{ type: 'select', key: 'unload', source: 'states', multiple: true, placeholder: 'splash.editor.actionEditor.unloadStates' },
			{ type: 'conditions', key: 'conditions' },
		],
	});
	// Real handlers live per-runtime (or in the sync layer, for vote); these stubs only register the
	// action so the editor lists it from the API instead of hardcoding.
	const runtimeActionWarning = () => console.warn('Splash | This action only works inside a running splash.');
	api.registerAction('set-value', 'splash.editor.actionEditor.typeSetValue', runtimeActionWarning, {
		icon: 'fa-solid fa-equals',
		defaults: { type: 'set-value', key: '', value: '' },
		fields: [
			{ type: 'text', key: 'key', label: 'splash.editor.actionEditor.key' },
			{ type: 'text', key: 'value', label: 'splash.editor.actionEditor.value' },
		],
	});
	api.registerAction('increment-value', 'splash.editor.actionEditor.typeIncrementValue', runtimeActionWarning, {
		icon: 'fa-solid fa-plus-minus',
		defaults: { type: 'increment-value', key: '', step: 1, min: null, max: null, wrap: false },
		fields: [
			{ type: 'text', key: 'key', label: 'splash.editor.actionEditor.key' },
			{ type: 'number', key: 'step', label: 'splash.editor.actionEditor.step', group: 'n' },
			{ type: 'number', key: 'min', label: 'splash.editor.actionEditor.min', group: 'n' },
			{ type: 'number', key: 'max', label: 'splash.editor.actionEditor.max', group: 'n' },
			{ type: 'checkbox', key: 'wrap', label: 'splash.editor.actionEditor.wrap' },
		],
	});
	api.registerAction('vote', 'splash.editor.actionEditor.typeVote', runtimeActionWarning, {
		icon: 'fa-solid fa-check-to-slot',
		defaults: { type: 'vote', optionId: '' },
		fields: [{ type: 'text', key: 'optionId', label: 'splash.editor.actionEditor.voteOptionId' }],
	});
	api.registerAction('script', 'splash.editor.actionEditor.typeScript', runtimeActionWarning, {
		icon: 'fa-solid fa-code',
		defaults: { type: 'script', source: '' },
		fields: [{ type: 'code', key: 'source', hint: 'splash.editor.actionEditor.scriptHint' }],
	});
	api.registerAction('close', 'splash.editor.actionEditor.typeClose', () => {
		Hooks.call('splash.close-splash');
	}, { icon: 'fa-solid fa-xmark', defaults: { type: 'close' }, fields: [] });
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

async function instantiatePixelate(
	animation: AnimationInitialized,
	sprite: PIXI.DisplayObject,
	app: PIXI.Application,
) {
	if (animation.type !== 'pixelate') return;
	const filter = await PixelateFilter(app, animation);
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
