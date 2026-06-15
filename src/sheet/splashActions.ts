import type { SplashInitialized } from '../datamodel/SplashModel.ts';
import type { SplashPage } from '../utils/launch.ts';
import { SplashAPI } from '../api/api.ts';
import { openSplashEditorApp } from '../apps/SplashEditorApplication.ts';
import { openSplashTriggersApp } from '../apps/SplashTriggersApplication.ts';
import { canTriggerSplash, canViewSplash } from '../utils/launch.ts';

/** One quick-access action descriptor for the page-sheet bar. */
export interface SplashActionDef {
	action: string;
	icon: string;
	/** i18n key. */
	label: string;
	disabled: boolean;
}

/** The actions valid for a splash given its `layer` and the current user's permissions. */
export function availableActions(page: SplashPage): SplashActionDef[] {
	const system = page.system as SplashInitialized;
	const canTrigger = canTriggerSplash(page);
	const canView = canViewSplash(page);
	const defs: SplashActionDef[] = [];

	if (system.layer === 'handout') {
		defs.push({ action: 'open-handout', icon: 'fa-solid fa-window-maximize', label: 'splash.actions.openHandout', disabled: !canView });
	} else {
		defs.push({ action: 'launch', icon: 'fa-solid fa-play', label: 'splash.actions.launch', disabled: !canTrigger });
		defs.push({ action: 'preview', icon: 'fa-solid fa-eye', label: 'splash.actions.preview', disabled: !canView });
	}
	defs.push({ action: 'edit', icon: 'fa-solid fa-pen-to-square', label: 'splash.actions.edit', disabled: !canTrigger });
	defs.push({ action: 'triggers', icon: 'fa-solid fa-bolt', label: 'splash.actions.triggers', disabled: !canTrigger });
	return defs;
}

/** Launch a fullscreen splash for the whole table. */
export async function launchSplash(page: SplashPage): Promise<void> {
	await SplashAPI.getInstance().launch(page.uuid, { global: true });
}

/** Show a fullscreen splash locally (GM preview only — not broadcast). */
export async function previewSplash(page: SplashPage): Promise<void> {
	await SplashAPI.getInstance().launch(page.uuid);
}

/** Open a handout window locally. */
export async function openHandoutSplash(page: SplashPage): Promise<void> {
	await SplashAPI.getInstance().openHandout(page.uuid);
}

/** Open the visual content editor for a splash. */
export function openSplashEditor(page: SplashPage): void {
	openSplashEditorApp(page);
}

/** Open the triggers window for a splash. */
export function openSplashTriggers(page: SplashPage): void {
	openSplashTriggersApp(page);
}

/** Dispatch a page-sheet action by its id. */
export function runSplashAction(action: string, page: SplashPage): void {
	switch (action) {
		case 'launch':
			void launchSplash(page);
			break;
		case 'preview':
			void previewSplash(page);
			break;
		case 'open-handout':
			void openHandoutSplash(page);
			break;
		case 'edit':
			openSplashEditor(page);
			break;
		case 'triggers':
			openSplashTriggers(page);
			break;
	}
}
