import type { RuntimeSnapshot } from '../renderer/SplashRuntime.ts';
import { mount, unmount } from 'svelte';
import { SplashAPI } from '../api/api.ts';
import SplashDirectorTab from '../svelte/director/SplashDirectorTab.svelte';
import { ID, PACKAGE_ID } from '../utils/const.js';
import { canViewSplash, isSplashPage } from '../utils/launch.ts';
import { getObsUtilsModule } from '../utils/obsUtils.ts';
import { SETTING_OBS_LAST_STATE, SETTING_SPECTATED_USER } from '../utils/settings.ts';
import { isRuntimeSnapshot } from '../utils/sync.ts';

interface PresenceEvent {
	eventType: 'splashPresence';
	senderId: string;
	payload: { uuid: string; snapshot: RuntimeSnapshot | null };
}
interface ClearStreamEvent {
	eventType: 'splashClearStream';
	senderId: string;
}
interface LastState {
	uuid: string;
	snapshot: RuntimeSnapshot | null;
	mode: string;
}

let spectatedUserId: string | null = null;
let openUuid: string | null = null;
let openMode: string | null = null;

/** Imported only when OBS Utils is present (see index.ts). Director tab for the GM; spectate mirror for the OBS client. */
export function registerObsUtilsCompat(): void {
	const api = getObsUtilsModule()?.api;
	if (!api) return;
	if (game.user?.isGM) {
		// OBS Utils 5.1.2+ lets the registering module mount its own UI (cross-bundle-safe). On older versions
		// only registerDirectorTab exists, which can't mount our Svelte 5 component (effect_orphan) — fall back
		// to it so init never throws, even though the tab won't render there.
		if (typeof api.registerDirectorTabSvelte5 === 'function') {
			api.registerDirectorTabSvelte5({
				key: 'splash.director',
				label: 'splash.director.tabLabel',
				icon: 'fas fa-images',
				order: 100,
				mount: (target: HTMLElement, props: { disabled: boolean }) => {
					const app = mount(SplashDirectorTab, { target, props });
					return () => unmount(app);
				},
			});
		} else {
			api.registerDirectorTab({ key: 'splash.director', label: 'splash.director.tabLabel', icon: 'fas fa-images', component: SplashDirectorTab, order: 100 });
		}
	}
	if (api.isOBS()) registerSpectator();
}

/** Director: close everything the OBS clients are showing — the mirror and any streamed handouts. */
export function broadcastClearStream(): void {
	game.socket?.emit(`module.${PACKAGE_ID}`, { eventType: 'splashClearStream', senderId: game.userId ?? '' } satisfies ClearStreamEvent);
}

/** OBS client: mirror the player named in the `spectatedUser` setting, and remember what it shows so a reload restores it. */
function registerSpectator(): void {
	const readSpectated = (): string | null => (game.settings?.get(ID, SETTING_SPECTATED_USER) as string) || null;
	let pending = Promise.resolve();
	/** Keep opening, updates and closing in arrival order, recovering the queue after a failed operation. */
	const enqueue = (update: () => Promise<void>): Promise<void> => {
		pending = pending.then(update).catch((error) => {
			console.error('Splash | spectator update failed', error);
		});
		return pending;
	};
	spectatedUserId = readSpectated();
	void enqueue(restoreLastState);

	Hooks.on('splash.spectated-changed', () => {
		spectatedUserId = readSpectated();
		// Drop the current mirror; the newly-watched player's next presence reopens it.
		void enqueue(closeSpectate);
	});

	game.socket?.on(`module.${PACKAGE_ID}`, (event: PresenceEvent | ClearStreamEvent, senderId: string) => enqueue(async () => {
		if (typeof senderId !== 'string') return;
		const sender = game.users?.get(senderId);
		if (!sender) return;
		if (event?.eventType === 'splashClearStream') {
			if (!sender.isGM) return;
			await clearAll();
			return;
		}
		if (event?.eventType !== 'splashPresence') return;
		if (!spectatedUserId || senderId !== spectatedUserId) return;
		if (!event.payload || typeof event.payload.uuid !== 'string') return;
		const { uuid, snapshot } = event.payload;
		if (!uuid || !snapshot) {
			await closeSpectate();
			return;
		}
		if (!isRuntimeSnapshot(snapshot)) return;
		const page = await fromUuid(uuid);
		if (!isSplashPage(page) || !canViewSplash(page, sender) || !canViewSplash(page)) {
			await closeSpectate();
			return;
		}
		const api = SplashAPI.getInstance();
		if (openUuid !== uuid) {
			await closeSpectate();
			await api.openSpectator(uuid);
			openUuid = uuid;
			openMode = (page.system as { mode?: string }).mode ?? 'local';
		}
		// Synced splashes get shared state from the sync flag (adopted in openSpectator, kept current by
		// registerSyncHooks); only local splashes carry the player's private state in the presence snapshot.
		if (openMode === 'local') await api.applySplashState(uuid, snapshot);
		saveLastState({ uuid, snapshot: openMode === 'local' ? snapshot : null, mode: openMode ?? 'local' });
	}));
}

function saveLastState(state: LastState | null): void {
	void game.settings?.set(ID, SETTING_OBS_LAST_STATE, state);
}

/** Reopen whatever this OBS client was last showing — survives reloads alongside the spectated-user world setting. */
async function restoreLastState(): Promise<void> {
	const last = game.settings?.get(ID, SETTING_OBS_LAST_STATE) as LastState | null;
	if (!last?.uuid) return;
	const page = await fromUuid(last.uuid);
	if (!isSplashPage(page) || !canViewSplash(page)) {
		saveLastState(null);
		return;
	}
	const api = SplashAPI.getInstance();
	await api.openSpectator(last.uuid);
	openUuid = last.uuid;
	openMode = last.mode;
	if (last.mode === 'local' && isRuntimeSnapshot(last.snapshot)) await api.applySplashState(last.uuid, last.snapshot);
}

/** Close everything this OBS client is showing: the mirror and any streamed handouts. */
async function clearAll(): Promise<void> {
	await closeSpectate();
	const { closeSplashOverlay } = await import('../apps/overlay.ts');
	for (const app of [...foundry.applications.instances.values()]) {
		const appId = (app as { id?: string }).id;
		if (appId?.startsWith('splash-handout-')) await (app as { close: () => Promise<unknown> }).close();
	}
	await closeSplashOverlay({ skipOutro: true });
	saveLastState(null);
}

async function closeSpectate(): Promise<void> {
	saveLastState(null);
	if (!openUuid) return;
	const uuid = openUuid;
	openUuid = null;
	openMode = null;
	await SplashAPI.getInstance().closeSpectator(uuid);
}
