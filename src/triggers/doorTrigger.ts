import type { TriggerBinding, TriggerOptions } from './types.ts';
import { SplashAPI } from '../api/api.ts';
import { ID } from '../utils/const.js';
import { setPendingTrigger } from './context.ts';

interface LibWrapper { register: (id: string, target: string, fn: (...a: unknown[]) => unknown, type: string) => void }

interface DoorControlLike {
	wall?: { document?: { getFlag: (scope: string, key: string) => unknown } };
	icon?: { width?: number };
	addChild: (child: unknown) => unknown;
	__splashBadge?: { destroy: () => void } | undefined;
}

/**
 * GM-only: badge any door control whose wall is bound to a splash, so the GM can see at a glance which
 * doors trigger one. The badge is rebuilt every `draw()` (door state changes, refreshes) and nudged on
 * flag edits so binding/unbinding shows immediately.
 */
export function registerDoorIndicator(): void {
	const libWrapper = (globalThis as { libWrapper?: LibWrapper }).libWrapper;
	if (!game.modules?.get('lib-wrapper')?.active || !libWrapper) return;
	try {
		libWrapper.register(ID, 'foundry.canvas.containers.DoorControl.prototype.draw', async function (this: DoorControlLike, wrapped: (...a: unknown[]) => Promise<unknown>, ...args: unknown[]) {
			const result = await wrapped(...args);
			try {
				this.__splashBadge?.destroy();
				this.__splashBadge = undefined;
				const bound = !!this.wall?.document?.getFlag(ID, 'launchSplash');
				if (bound && game.user?.isGM) {
					const size = this.icon?.width ?? 40;
					const badge = new PIXI.Graphics();
					badge.lineStyle(2, 0x1B1B1E, 1).beginFill(0xFF9800).drawCircle(0, 0, 7).endFill();
					badge.position.set(size / 2 - 1, -size / 2 + 1);
					this.addChild(badge);
					this.__splashBadge = badge as unknown as { destroy: () => void };
				}
			} catch (error) {
				console.error('Splash | door indicator failed:', error);
			}
			return result;
		}, 'WRAPPER');
	} catch (error) {
		console.error('Splash | Failed to wrap DoorControl for the splash indicator:', error);
	}

	// A flag change alone may not force the control to redraw — nudge it so the badge updates at once.
	Hooks.on('updateWall', (doc: { object?: { doorControl?: { draw: () => unknown } } }, changed: object) => {
		if (foundry.utils.hasProperty(changed, `flags.${ID}`)) doc.object?.doorControl?.draw();
	});
}

/**
 * Wrap `DoorControl#_onMouseDown` via libWrapper: clicking a locked, bound door launches its splash and
 * still runs the default behaviour, so the locked sound plays.
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
			if (doc?.ds === CONST.WALL_DOOR_STATES.LOCKED && uuid) {
				// Hand the door's uuid to the splash so a "solved" macro can unlock it (GMs trigger it too).
				setPendingTrigger({ door: (this.wall as { document?: { uuid?: string } })?.document?.uuid });
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
