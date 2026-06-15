import type { SplashAPI } from '../api/api.js';
import type {
	AnimationInitialized,
	ButtonSpriteInitialized,
	ChangeStateActionInitialized,
	ImageSpriteInitialized,
	MacroActionInitialized,
	PanelSpriteInitialized,
	State,
	TextSpriteInitialized,
} from '../datamodel/SplashModel.ts';
import type { SpriteContext } from '../renderer/SplashRenderer.ts';
import type { DissolveFilterProps } from '../shaders/dissolve/dissolve.js';
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
	api.registerAction('macro', 'Macro', executeMacro);
	api.registerAction('change-state', 'Change State', changeState);
	api.registerAction('close', 'Close Splash', () => {
		Hooks.call('splash.close-splash');
	});
	// Value actions are handled inside each runtime instance; these registrations
	// exist so editors can list them. Reaching the processor means the action was
	// dispatched outside a splash, where values don't exist.
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

	const sprite = PIXI.Sprite.from(image.img);
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

async function instantiateButton(button: ButtonSpriteInitialized, state: State, context: SpriteContext) {
	if (button.type !== 'button') throw new Error('Button type is not \'button\'');

	const buttonConfig = foundry.utils.mergeObject(button, {
		onTap: async () => {
			// Routed through the owning runtime so actions stay instance-scoped.
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
