import type { PresetKind } from '../datamodel/PresetModel.ts';
import type { AnimationCreate, ButtonImageCreate, ButtonSpriteCreate, SpriteCreate } from '../datamodel/SplashModel.ts';
import { nanoid } from 'nanoid';

/**
 * The preset library service. Presets are `splash.preset` JournalEntryPage subtypes living in a single
 * lazily-created world `JournalEntry` (the host-coupled choice is isolated HERE; swapping to Item/
 * compendium hosting touches only this file). Splits cleanly into pure transforms (no Foundry, unit
 * tested) and the thin document-CRUD surface on top.
 */

/** The world journal that holds every preset page. Created lazily on first save. */
export const PRESET_LIBRARY_NAME = 'Splash Presets';

/** A lightweight, browse-ready view of a stored preset. */
export interface PresetSummary {
	uuid: string;
	name: string;
	kind: PresetKind;
	img: string;
}

/** The discriminated payload as stored on a preset page (`system.payload`). */
export type PresetPayload
	= | ({ type: 'nineslice' } & ButtonImageCreate)
		| ({ type: 'button' } & Record<string, unknown>)
		| { type: 'animation'; value: AnimationCreate }
		| { type: 'sprite'; value: SpriteCreate }
		| { type: 'spriteGroup'; value: SpriteCreate[] };

// Core glyphs stand in for kinds that have no natural thumbnail — no shipped art dependency in v1.
const KIND_ICON: Record<string, string> = {
	animation: 'icons/svg/clockwork.svg',
	sprite: 'icons/svg/item-bag.svg',
	spriteGroup: 'icons/svg/chest.svg',
	fallback: 'icons/svg/book.svg',
};

// --- pure transforms (no Foundry document access; unit tested) ----------------

/** Presets carry style/content only — every onClick collapses to a bare close. */
export function sanitizeAction(): { type: 'close' } {
	return { type: 'close' };
}

/** First image-bearing sprite's url in a list, if any (for sprite/group thumbnails). */
function firstImageUrl(sprites: SpriteCreate[]): string | null {
	for (const s of sprites) {
		const r = s as Record<string, unknown>;
		if (r.type === 'image' && typeof r.img === 'string' && r.img) return r.img;
		if (r.type === 'button') {
			const url = (r.image as { url?: string } | undefined)?.url;
			if (url) return url;
		}
	}
	return null;
}

/** The compendium-browser thumbnail for a payload (§2.5 of the spec). */
export function presetThumb(payload: PresetPayload): string {
	switch (payload.type) {
		case 'nineslice': return payload.url || KIND_ICON.fallback;
		case 'button': return ((payload.image as { url?: string } | undefined)?.url) || KIND_ICON.fallback;
		case 'sprite': return firstImageUrl([payload.value]) ?? KIND_ICON.sprite;
		case 'spriteGroup': return firstImageUrl(payload.value) ?? KIND_ICON.spriteGroup;
		case 'animation': return KIND_ICON.animation;
		default: return KIND_ICON.fallback;
	}
}

/** Project a live button sprite to a button preset payload: style + label + image set, action stripped. */
export function buttonSpriteToPreset(btn: ButtonSpriteCreate): PresetPayload {
	const b = btn as Record<string, unknown>;
	const variant = (key: string) => (b[key] ? foundry.utils.deepClone(b[key]) : null);
	return {
		type: 'button',
		label: foundry.utils.deepClone(b.label),
		image: foundry.utils.deepClone(b.image),
		clickLabel: variant('clickLabel'),
		clickImage: variant('clickImage'),
		hoverLabel: variant('hoverLabel'),
		hoverImage: variant('hoverImage'),
		tint: (b.tint as string) ?? '',
		hoverTint: (b.hoverTint as string) ?? '',
		clickTint: (b.clickTint as string) ?? '',
		onClick: sanitizeAction(),
	};
}

/**
 * A reusable sprite payload for STORAGE: fresh id, no per-state placement (`states:{}`), guaranteed
 * `effects`, sanitized action. Content/style travels; world-specific placement does not.
 */
export function normalizeSpriteForPreset(sprite: SpriteCreate): SpriteCreate {
	const copy = foundry.utils.deepClone(sprite) as Record<string, unknown>;
	copy.id = nanoid();
	copy.states = {};
	if (!Array.isArray(copy.effects)) copy.effects = [];
	if (copy.type === 'button') copy.onClick = sanitizeAction();
	return copy as SpriteCreate;
}

/**
 * A placeable sprite for APPLY: fresh id, guaranteed `effects`, a placement in `stateKey`, and the
 * action RE-sanitized (an imported preset never went through our save, so don't trust it).
 */
export function materializeSprite(sprite: SpriteCreate, stateKey: string, at?: { x: number; y: number }): SpriteCreate {
	const copy = foundry.utils.deepClone(sprite) as Record<string, unknown>;
	copy.id = nanoid();
	if (!Array.isArray(copy.effects)) copy.effects = [];
	copy.states = { [stateKey]: { x: at?.x ?? 100, y: at?.y ?? 100, zIndex: 0, priority: 0, name: '' } };
	if (copy.type === 'button') copy.onClick = sanitizeAction();
	return copy as SpriteCreate;
}

/** Normalize a payload for storage — only sprite/group kinds need id/placement scrubbing. */
export function normalizePresetPayload(payload: PresetPayload): PresetPayload {
	if (payload.type === 'sprite') return { type: 'sprite', value: normalizeSpriteForPreset(payload.value) };
	if (payload.type === 'spriteGroup') return { type: 'spriteGroup', value: payload.value.map(normalizeSpriteForPreset) };
	return payload;
}

// --- document CRUD (needs the registered `splash.preset` page type → world relaunch to exercise) ----

let libraryInFlight: Promise<JournalEntry | null> | null = null;

/** The preset library journal, by name. Does NOT create it. */
export function findPresetLibrary(): JournalEntry | undefined {
	return game.journal?.getName(PRESET_LIBRARY_NAME) ?? undefined;
}

/**
 * The preset library, created once if missing. GM-only; players get null (they can still read an
 * existing library via its OBSERVER default ownership). Concurrent calls share one in-flight create so
 * two rapid saves never race two journals (mirrors discovery.ts's lazy default-journal pattern).
 */
export async function ensurePresetLibrary(): Promise<JournalEntry | null> {
	const existing = findPresetLibrary();
	if (existing) return existing;
	if (!game.user?.isGM) return null;
	libraryInFlight ??= JournalEntry.create({
		name: PRESET_LIBRARY_NAME,
		ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
	})
		.then(journal => (journal ?? null) as JournalEntry | null)
		.catch(() => null)
		.finally(() => { libraryInFlight = null; });
	return libraryInFlight;
}

/** Browse-ready summaries of every stored preset, optionally filtered by kind. */
export function allPresets(kind?: PresetKind): PresetSummary[] {
	const library = findPresetLibrary();
	if (!library) return [];
	return library.pages.contents
		.filter(page => page.type === 'splash.preset')
		.map((page) => {
			const payload = (page.system as { payload?: PresetPayload }).payload;
			return payload && { uuid: page.uuid, name: page.name, kind: payload.type, img: presetThumb(payload) };
		})
		.filter((s): s is PresetSummary => !!s && (!kind || s.kind === kind));
}

/**
 * Preset summaries from every JournalEntry COMPENDIUM — so a module can ship presets that need no
 * import. Cheap: the pack index already carries each entry's page list with types, so we only load the
 * (few) entries that actually contain `splash.preset` pages, never whole unrelated lore packs.
 */
export async function compendiumPresets(kind?: PresetKind): Promise<PresetSummary[]> {
	const out: PresetSummary[] = [];
	for (const pack of game.packs ?? []) {
		if (pack.metadata.type !== 'JournalEntry') continue;
		let index;
		try {
			index = await pack.getIndex({ fields: ['pages'] });
		} catch {
			continue;
		}
		for (const entry of index) {
			const pages = (entry as { pages?: { type?: string }[] }).pages ?? [];
			if (!pages.some(p => p.type === 'splash.preset')) continue;
			const doc = await pack.getDocument((entry as { _id: string })._id) as { pages?: Iterable<JournalEntryPage> } | null;
			for (const page of doc?.pages ?? []) {
				if (page.type !== 'splash.preset') continue;
				const payload = (page.system as { toObject?: () => { payload?: PresetPayload } }).toObject?.().payload;
				if (payload && (!kind || payload.type === kind)) {
					out.push({ uuid: page.uuid, name: page.name, kind: payload.type, img: presetThumb(payload) });
				}
			}
		}
	}
	return out;
}

/** Save a new preset page (GM-only, lazily creating the library). Create-only in v1 (no overwrite). */
export async function savePreset(payload: PresetPayload, name: string): Promise<JournalEntryPage | null> {
	const library = await ensurePresetLibrary();
	if (!library) {
		ui.notifications?.warn('Splash | Only a GM can save presets.');
		return null;
	}
	const created = await library.createEmbeddedDocuments('JournalEntryPage', [
		{ name: name || `New ${payload.type}`, type: 'splash.preset', system: { payload: normalizePresetPayload(payload) } },
	]);
	return (created?.[0] ?? null) as JournalEntryPage | null;
}

/**
 * Load a preset's payload for apply. Reads SOURCE data via `system.toObject()` — NOT the initialized
 * `system.payload` — because the editor writes source data (e.g. a ColorField tint must be a hex string,
 * not a live Color instance); the splash store does the same (`page.system.toObject()`).
 */
export async function loadPresetPayload(uuid: string): Promise<PresetPayload | null> {
	const page = await fromUuid(uuid);
	const system = (page as { system?: { toObject?: () => { payload?: PresetPayload } } } | null)?.system;
	const payload = system?.toObject?.().payload;
	return payload ? (foundry.utils.deepClone(payload) as PresetPayload) : null;
}

/** Prompt the GM for a name and save the payload as a preset. A no-op (with a warning) for players. */
export async function promptAndSavePreset(payload: PresetPayload, defaultName: string): Promise<void> {
	if (!game.user?.isGM) {
		ui.notifications?.warn('Splash | Only a GM can save presets.');
		return;
	}
	const safeName = defaultName.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c] ?? c));
	const name = await foundry.applications.api.DialogV2.prompt({
		window: { title: 'Save preset' },
		content: `<input type="text" name="name" value="${safeName}" style="width:100%" autofocus />`,
		ok: { label: 'Save', callback: (_event: unknown, button: { form: HTMLFormElement }) => (button.form.elements.namedItem('name') as HTMLInputElement)?.value },
	}).catch(() => null);
	if (name == null) return;
	const saved = await savePreset(payload, String(name).trim() || defaultName);
	if (saved) ui.notifications?.info(`Splash | Saved preset "${saved.name}".`);
}
