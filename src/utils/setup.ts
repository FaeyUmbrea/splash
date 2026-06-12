import type { SplashAPI } from '../api/api.js';
import type {
	AnimationInitialized,
	ButtonSpriteInitialized,
	ChangeStateActionInitialized,
	ImageSpriteInitialized,
	MacroActionInitialized,
	State,
	TextSpriteInitialized,
} from '../datamodel/SplashModel.ts';
import type { SpriteContext } from '../renderer/SplashRenderer.ts';
import type { DissolveFilterProps } from '../shaders/dissolve/dissolve.js';
import NineSlicePlaneButton from '../pixi/nineSlicePlaneButton.js';
import { transitionState } from '../pixi/transitionState.ts';
import DissolveFilter from '../shaders/dissolve/dissolve.js';

export function setupAPI(api: SplashAPI) {
	api.registerAnimation('dissolve', 'Dissolve Animation', instantiateDissolve);
	api.registerSprite('text', 'Text', instantiateText);
	api.registerSprite('image', 'Image', instantiateImage);
	api.registerSprite('button', 'Button', instantiateButton);
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
