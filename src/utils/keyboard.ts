import { ID } from './const.js';

export function registerKeybindings(): void {
	(game as ReadyGame | undefined)?.keybindings?.register(ID, 'close-splash', {
		editable: [{ key: 'KeyQ', modifiers: ['CONTROL'] }],
		restricted: false,
		name: 'Close Splash',
		hint: 'Closes Splash Overlay',
		onDown: (): void => {
			Hooks.call('splash.close-splash');
		},
	});
}
