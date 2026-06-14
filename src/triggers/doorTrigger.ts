import type { TriggerBinding, TriggerOptions } from './types.ts';
import { SplashAPI } from '../api/api.ts';
import { ID } from '../utils/const.js';

interface LibWrapper { register: (id: string, target: string, fn: (...a: unknown[]) => unknown, type: string) => void }

/**
 * Wrap `DoorControl#_onMouseDown` through libWrapper (the correct way to monkeypatch): a LOCKED,
 * bound door clicked by a player launches the bound splash AND still runs the default behaviour, so
 * the locked sound plays — we never swallow it.
 */
export function registerDoorWrap(): void {
	const libWrapper = (globalThis as { libWrapper?: LibWrapper }).libWrapper;
	if (!game.modules?.get('lib-wrapper')?.active || !libWrapper) {
		console.warn('Splash | libWrapper is not active — door triggers are disabled until it is installed.');
		return;
	}
	try {
		libWrapper.register(ID, 'foundry.canvas.containers.DoorControl.prototype._onMouseDown', function (this: { wall?: { document?: { ds?: number; getFlag: (s: string, k: string) => unknown } } }, wrapped: (...a: unknown[]) => unknown, ...args: unknown[]) {
			const doc = this.wall?.document;
			const uuid = doc?.getFlag(ID, 'launchSplash') as string | undefined;
			if (doc?.ds === CONST.WALL_DOOR_STATES.LOCKED && uuid && !game.user?.isGM) {
				void SplashAPI.getInstance().launch(uuid);
			}
			return wrapped(...args);
		}, 'WRAPPER');
	} catch (error) {
		console.error('Splash | Failed to wrap DoorControl for door triggers:', error);
	}
}

interface WallLike { id: string; uuid: string; door: number; getFlag: (s: string, k: string) => unknown; setFlag: (s: string, k: string, v: unknown) => Promise<unknown> }
interface SceneLike { id: string; name: string; walls: { contents: WallLike[]; get: (id: string) => WallLike | undefined } & Iterable<WallLike> }

export const doorTrigger: TriggerOptions = {
	icon: 'fa-solid fa-door-closed',

	async createBinding(splashUuid: string): Promise<boolean> {
		const scene = canvas?.scene as unknown as SceneLike | null;
		const doors = (scene?.walls?.contents ?? []).filter(w => w.door > 0);
		if (!scene || doors.length === 0) {
			ui.notifications?.warn('Splash | No doors on the active scene to bind.');
			return false;
		}
		const options = doors.map((w, i) => `<option value="${w.id}">Door ${i + 1}</option>`).join('');
		const wallId = await foundry.applications.api.DialogV2.prompt({
			window: { title: 'Bind door trigger' },
			content: `<p>Clicking which locked door launches this splash?</p><select name="door" style="width:100%">${options}</select>`,
			ok: { callback: (_e: Event, button: HTMLButtonElement) => (button.form?.elements.namedItem('door') as HTMLSelectElement)?.value },
		}).catch(() => null);
		if (!wallId) return false;
		await scene.walls.get(wallId)?.setFlag(ID, 'launchSplash', splashUuid);
		return true;
	},

	listBindings(): TriggerBinding[] {
		const bindings: TriggerBinding[] = [];
		for (const scene of (game.scenes ?? []) as unknown as Iterable<SceneLike>) {
			for (const wall of scene.walls) {
				const uuid = wall.getFlag(ID, 'launchSplash') as string | undefined;
				if (uuid) bindings.push({ id: wall.uuid, type: 'door', splashUuid: uuid, summary: `Door in "${scene.name}"`, sceneId: scene.id });
			}
		}
		return bindings;
	},

	async removeBinding(binding: TriggerBinding): Promise<void> {
		const wall = await fromUuid(binding.id) as { unsetFlag?: (s: string, k: string) => Promise<unknown> } | null;
		await wall?.unsetFlag?.(ID, 'launchSplash');
	},
};
