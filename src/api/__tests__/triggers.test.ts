import type { TriggerOptions } from '../../public-api.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SplashAPI } from '../api.ts';

/** Supply trigger callbacks without creating or changing any Foundry documents. */
function triggerOptions(): TriggerOptions {
	return {
		icon: 'fa-solid fa-door-closed',
		createBinding: async () => true,
		listBindings: () => [],
		removeBinding: async () => {},
	};
}

afterEach(() => vi.unstubAllGlobals());

describe('trigger label localization', () => {
	it('registers before i18n is available and resolves labels when read', () => {
		const api = new SplashAPI();
		const options = triggerOptions();
		api.registerTrigger('door', 'splash.triggers.setup.doorLabel', options);

		let label = 'Player clicks a locked door';
		vi.stubGlobal('game', { i18n: { localize: () => label } });
		expect(api.registeredTriggers[0].label).toBe(label);
		expect(api.getTrigger('door')?.label).toBe(label);
		expect(api.getTrigger('door')?.createBinding).toBe(options.createBinding);

		label = 'Spieler klickt auf eine verschlossene Tür';
		expect(api.registeredTriggers[0].label).toBe(label);
		expect(api.getTrigger('door')?.label).toBe(label);
	});

	it('preserves plain third-party labels and returns undefined for unknown types', () => {
		const api = new SplashAPI();
		api.registerTrigger('custom', 'Custom trigger', triggerOptions());
		vi.stubGlobal('game', { i18n: { localize: (key: string) => key } });

		expect(api.registeredTriggers[0].label).toBe('Custom trigger');
		expect(api.getTrigger('custom')?.label).toBe('Custom trigger');
		expect(api.getTrigger('missing')).toBeUndefined();
	});
});
