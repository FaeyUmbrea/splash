import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const launch = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../../api/api.ts', () => ({ SplashAPI: { getInstance: () => ({ launch }) } }));

beforeEach(() => {
	vi.resetModules();
	launch.mockClear();
	vi.stubGlobal('foundry', { data: { regionBehaviors: { RegionBehaviorType: class {} } } });
	vi.stubGlobal('CONST', { REGION_EVENTS: { TOKEN_ENTER: 'tokenEnter' } });
});
afterEach(() => vi.unstubAllGlobals());

it('launches locally with the entering region and token context', async () => {
	const { LaunchSplashBehavior } = await import('../regionTrigger.ts');
	const { consumePendingTrigger } = await import('../context.ts');
	await LaunchSplashBehavior.events.tokenEnter.call(
		{ splashUuid: 'page', region: { uuid: 'region' } },
		{ user: { isSelf: true }, data: { token: { uuid: 'token' } } },
	);
	expect(launch).toHaveBeenCalledExactlyOnceWith('page');
	expect(consumePendingTrigger()).toEqual({ region: 'region', token: 'token' });
	expect(consumePendingTrigger()).toBeNull();
});

it.each([false, undefined])('ignores another client’s token-enter event (%s)', async (isSelf) => {
	const { LaunchSplashBehavior } = await import('../regionTrigger.ts');
	const { consumePendingTrigger } = await import('../context.ts');
	await LaunchSplashBehavior.events.tokenEnter.call(
		{ splashUuid: 'page', region: { uuid: 'region' } },
		{ user: { isSelf }, data: { token: { uuid: 'token' } } },
	);
	expect(launch).not.toHaveBeenCalled();
	expect(consumePendingTrigger()).toBeNull();
});

it('does not leave context for an unbound region', async () => {
	const { LaunchSplashBehavior } = await import('../regionTrigger.ts');
	const { consumePendingTrigger } = await import('../context.ts');
	await LaunchSplashBehavior.events.tokenEnter.call(
		{ region: { uuid: 'region' } },
		{ user: { isSelf: true }, data: { token: { uuid: 'token' } } },
	);
	expect(launch).not.toHaveBeenCalled();
	expect(consumePendingTrigger()).toBeNull();
});
