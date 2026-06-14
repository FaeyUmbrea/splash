import type { TriggerBinding, TriggerOptions } from './types.ts';
import { SplashAPI } from '../api/api.ts';

/** Region-behaviour subtype id. The trigger-definition type (registered with the API) is 'region'. */
const BEHAVIOR_TYPE = 'splash.launchSplash';

const RegionBehaviorTypeBase = (foundry.data as { regionBehaviors: { RegionBehaviorType: new (...args: never[]) => object } }).regionBehaviors.RegionBehaviorType;

/** A Scene Region behaviour: when a token enters the region, the entering player launches a splash. */
export class LaunchSplashBehavior extends RegionBehaviorTypeBase {
	static defineSchema() {
		const fields = foundry.data.fields;
		return { splashUuid: new fields.StringField({ required: true, blank: false }) };
	}

	static events = {
		async [CONST.REGION_EVENTS.TOKEN_ENTER](this: { splashUuid?: string }, event: { user?: { isSelf?: boolean } }) {
			// Fire on the entering client only, so the splash opens locally for that player.
			if (!event.user?.isSelf) return;
			if (this.splashUuid) await SplashAPI.getInstance().launch(this.splashUuid);
		},
	};
}

/** Register the region-behaviour subtype into CONFIG (called at init). */
export function registerRegionBehavior(): void {
	const config = CONFIG.RegionBehavior as unknown as {
		dataModels: Record<string, unknown>;
		typeLabels: Record<string, string>;
		typeIcons: Record<string, string>;
	};
	config.dataModels[BEHAVIOR_TYPE] = LaunchSplashBehavior;
	config.typeLabels[BEHAVIOR_TYPE] = 'splash.triggers.region.label';
	config.typeIcons[BEHAVIOR_TYPE] = 'fa-solid fa-bolt';
}

interface RegionLike { id: string; name: string; behaviors: Iterable<{ type: string; uuid: string; system: { splashUuid: string } }>; createEmbeddedDocuments: (type: string, data: object[]) => Promise<unknown> }
interface SceneLike { id: string; name: string; regions: { contents: RegionLike[]; get: (id: string) => RegionLike | undefined } & Iterable<RegionLike> }

export const regionTrigger: TriggerOptions = {
	icon: 'fa-solid fa-vector-square',

	async createBinding(splashUuid: string): Promise<boolean> {
		const scene = canvas?.scene as unknown as SceneLike | null;
		const regions = scene?.regions?.contents ?? [];
		if (!scene || regions.length === 0) {
			ui.notifications?.warn('Splash | Create a Scene Region on the active scene first, then bind it.');
			return false;
		}
		const options = regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
		const regionId = await foundry.applications.api.DialogV2.prompt({
			window: { title: 'Bind region trigger' },
			content: `<p>A token entering which region launches this splash?</p><select name="region" style="width:100%">${options}</select>`,
			ok: { callback: (_e: Event, button: HTMLButtonElement) => (button.form?.elements.namedItem('region') as HTMLSelectElement)?.value },
		}).catch(() => null);
		if (!regionId) return false;
		const region = scene.regions.get(regionId);
		await region?.createEmbeddedDocuments('RegionBehavior', [{ type: BEHAVIOR_TYPE, name: 'Launch Splash', system: { splashUuid } }]);
		return true;
	},

	listBindings(): TriggerBinding[] {
		const bindings: TriggerBinding[] = [];
		for (const scene of (game.scenes ?? []) as unknown as Iterable<SceneLike>) {
			for (const region of scene.regions) {
				for (const behavior of region.behaviors) {
					if (behavior.type !== BEHAVIOR_TYPE) continue;
					bindings.push({
						id: behavior.uuid,
						type: 'region',
						splashUuid: behavior.system.splashUuid,
						summary: `Region "${region.name}" in "${scene.name}"`,
						sceneId: scene.id,
					});
				}
			}
		}
		return bindings;
	},

	async removeBinding(binding: TriggerBinding): Promise<void> {
		const behavior = await fromUuid(binding.id) as { delete?: () => Promise<unknown> } | null;
		await behavior?.delete?.();
	},
};
