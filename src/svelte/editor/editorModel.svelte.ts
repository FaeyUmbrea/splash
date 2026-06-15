import type { SpriteCreate, StateCreate } from '../../datamodel/SplashModel.ts';
import type { SplashPage } from '../../utils/launch.ts';
import type { SpriteType } from './spriteFactory.ts';
import { nanoid } from 'nanoid';
import { materializeSprite } from '../../utils/presets.ts';
import { DocumentStore } from './documentStore.svelte.ts';
import { createSprite } from './spriteFactory.ts';

/** An object as the editor (and a human) thinks of it — not the raw sprite schema. */
export interface EditorObject {
	id: string;
	type: string;
	/** Display name — a sensible default ("Text 1") when the sprite has no name; never the raw id. */
	name: string;
	raw: SpriteCreate;
	/** Whether this object is placed in the active state. */
	inState: boolean;
	/** Its placement in the active state, if any. */
	placement?: StateCreate;
}

export interface EditorState {
	key: string;
	label: string;
	isInitial: boolean;
}

const TYPE_LABEL: Record<string, string> = { image: 'Image', text: 'Text', button: 'Button' };

/** Delete a dotted-path leaf from a plain object, mirroring a server-side `-=` field deletion. */
function deleteLeaf(obj: object, path: string): void {
	const segments = path.split('.');
	const leaf = segments.pop();
	if (!leaf) return;
	const parent = segments.length ? foundry.utils.getProperty(obj, segments.join('.')) : obj;
	if (parent && typeof parent === 'object') delete (parent as Record<string, unknown>)[leaf];
}

function defaultPlacement(): Record<string, unknown> {
	return { x: 100, y: 100, zIndex: 0, priority: 0, name: '' };
}

/**
 * The editor's conceptual layer over the splash data model. The model is built for clean
 * programmatic access; THIS is built for how a human builds a splash — objects, states,
 * "place this object in this state", "what's selected" — and never exposes raw `sprite.states[k].x`
 * to the UI. Every write is optimistic-then-atomic via the DocumentStore.
 */
export class EditorModel {
	readonly store: DocumentStore;
	activeState = $state('');
	selectedIds = $state<string[]>([]);
	/** The group currently "entered" for member-level editing (Figma-style isolation). null = top level. */
	activeGroup = $state<string | null>(null);

	constructor(page: SplashPage) {
		this.store = new DocumentStore(page);
		this.activeState = Object.keys(this.store.data.states ?? {})[0] ?? 'initial';
	}

	get page(): SplashPage {
		return this.store.page;
	}

	get data() {
		return this.store.data;
	}

	// --- derived human views -------------------------------------------------

	readonly objects = $derived.by<EditorObject[]>(() => {
		const children = (this.data.children ?? []) as SpriteCreate[];
		const counts: Record<string, number> = {};
		return children.map((raw) => {
			const type = raw.type ?? 'image';
			counts[type] = (counts[type] ?? 0) + 1;
			const name = (raw.name && raw.name.trim()) ? raw.name : `${TYPE_LABEL[type] ?? 'Object'} ${counts[type]}`;
			const placement = raw.states?.[this.activeState] as StateCreate | undefined;
			return { id: raw.id ?? '', type, name, raw, inState: !!placement, placement };
		});
	});

	readonly objectsInState = $derived(this.objects.filter(o => o.inState));
	readonly selectedObjects = $derived(this.objects.filter(o => this.selectedIds.includes(o.id)));
	/** The single selected object for the inspector — null when zero or multiple are selected. */
	readonly selected = $derived(this.selectedIds.length === 1 ? (this.objects.find(o => o.id === this.selectedIds[0]) ?? null) : null);
	/** The last-clicked selection, used to drive the inspector tab focus. */
	readonly selectedId = $derived(this.selectedIds.at(-1) ?? null);

	isSelected(id: string): boolean {
		return this.selectedIds.includes(id);
	}

	readonly states = $derived.by<EditorState[]>(() => {
		const initial = this.data.initialState ?? [];
		return Object.entries(this.data.states ?? {}).map(([key, s]) => ({
			key,
			label: (s as { label?: string }).label || key,
			isInitial: initial.includes(key),
		}));
	});

	readonly activeStateDef = $derived(
		(this.data.states?.[this.activeState] ?? { label: '', onEnter: [] }) as { label?: string; onEnter?: unknown[] },
	);

	// --- undo/redo passthrough ----------------------------------------------

	get canUndo() {
		return this.store.canUndo;
	}

	get canRedo() {
		return this.store.canRedo;
	}

	undo() {
		void this.store.undo();
	}

	redo() {
		void this.store.redo();
	}

	destroy() {
		this.store.destroy();
	}

	// --- write primitives (optimistic via the store) ------------------------

	#setChildren(children: SpriteCreate[]) {
		this.store.write(
			(d) => {
				d.children = children;
			},
			() => this.page.update({ 'system.children': children }, { recursive: false }),
		);
	}

	#mutateChildren(mutate: (next: SpriteCreate[]) => void) {
		const next = foundry.utils.deepClone(this.data.children ?? []) as SpriteCreate[];
		mutate(next);
		this.#setChildren(next);
	}

	#setStates(states: Record<string, unknown>) {
		this.store.write(
			(d) => {
				d.states = states as never;
			},
			() => this.page.update({ 'system.states': states }, { recursive: false }),
		);
	}

	setField(path: string, value: unknown, replace = false) {
		// `replace` force-replaces this one field (e.g. swapping a whole animation object instead of
		// deep-merging stale sub-keys) via Foundry's `==`/`-=` key prefixes on the leaf segment — NOT
		// `{recursive:false}`, which would disable merging for the whole `system` and wipe children/states.
		// A null value with replace means "clear the field", which needs the `-=` delete prefix (`==`+null
		// is a no-op); a non-null value uses `==` to overwrite the whole field.
		const clearing = replace && value === null;
		let key = `system.${path}`;
		if (replace) key = clearing ? `system.${path.replace(/([^.]+)$/, '-=$1')}` : `system.${path.replace(/([^.]+)$/, '==$1')}`;
		this.store.write(
			// Mirror the persisted shape exactly: a `-=` delete omits the key, so the optimistic mirror must
			// delete it too (not set null) — otherwise the server echo looks like an external edit and records
			// a phantom undo step.
			d => (clearing ? deleteLeaf(d as object, path) : foundry.utils.setProperty(d as object, path, value)),
			() => this.page.update({ [key]: value }),
		);
	}

	setFields(changes: Record<string, unknown>, options: object = {}) {
		this.store.write(
			(d) => { for (const [p, v] of Object.entries(changes)) foundry.utils.setProperty(d as object, p, v); },
			() => this.page.update(Object.fromEntries(Object.entries(changes).map(([p, v]) => [`system.${p}`, v])), options),
		);
	}

	// --- grouping & isolation ------------------------------------------------

	/** The ids that selecting `id` should grab: its whole group (top level) or just itself (when isolated). */
	#selectionFor(id: string): string[] {
		const sprite = (this.data.children ?? []).find(c => c?.id === id) as SpriteCreate | undefined;
		const groupId = sprite?.groupId;
		if (groupId && this.activeGroup !== groupId) {
			return (this.data.children ?? []).filter(c => (c as SpriteCreate)?.groupId === groupId).map(c => c?.id).filter(Boolean) as string[];
		}
		return [id];
	}

	/** Enter a group for member-level editing (double-click). */
	enterGroup(groupId: string | null) {
		this.activeGroup = groupId;
	}

	/** Pop back out to top-level selection (Esc / click empty space). */
	exitGroup() {
		this.activeGroup = null;
	}

	/** Group the current selection under a fresh shared id; clears isolation. */
	group() {
		const ids = this.selectedIds;
		if (ids.length < 2) return;
		const groupId = nanoid();
		this.#mutateChildren((next) => {
			for (const sprite of next) {
 if (ids.includes(sprite.id ?? '')) sprite.groupId = groupId;
}
		});
		this.activeGroup = null;
	}

	/** Ungroup every group the selection touches. */
	ungroup() {
		const groupIds = (this.data.children ?? [])
			.filter(c => this.selectedIds.includes(c?.id ?? ''))
			.map(c => (c as SpriteCreate)?.groupId)
			.filter(Boolean) as string[];
		if (!groupIds.length) return;
		this.#mutateChildren((next) => {
			for (const sprite of next) {
				if (sprite.groupId && groupIds.includes(sprite.groupId)) sprite.groupId = null;
			}
		});
		this.activeGroup = null;
	}

	/** Whether the selection spans a group (so "Ungroup" is offered) or ≥2 loose objects ("Group"). */
	get selectionGrouped(): boolean {
		return (this.data.children ?? []).some(c => this.selectedIds.includes(c?.id ?? '') && (c as SpriteCreate)?.groupId);
	}

	// --- object operations ---------------------------------------------------

	/** Select one object — group-aware: at top level a grouped object selects its whole group. */
	select(id: string | null, additive = false) {
		if (id === null) {
			this.selectedIds = [];
			return;
		}
		const ids = this.#selectionFor(id);
		if (additive) {
			const allSelected = ids.every(x => this.selectedIds.includes(x));
			this.selectedIds = allSelected
				? this.selectedIds.filter(x => !ids.includes(x))
				: [...this.selectedIds, ...ids.filter(x => !this.selectedIds.includes(x))];
		} else {
			this.selectedIds = ids;
		}
	}

	/** Replace (or extend) the selection with a set of ids — used by the lasso. Group-aware like select(). */
	selectMany(ids: string[], additive = false) {
		const expanded = ids.flatMap(id => this.#selectionFor(id));
		const unique = expanded.filter((id, i) => expanded.indexOf(id) === i);
		this.selectedIds = additive
			? [...this.selectedIds, ...unique.filter(i => !this.selectedIds.includes(i))]
			: unique;
	}

	clearSelection() {
		this.selectedIds = [];
	}

	deleteSelected() {
		if (!this.selectedIds.length) return;
		const ids = this.selectedIds;
		this.#setChildren((this.data.children ?? []).filter(c => !ids.includes(c?.id ?? '')) as SpriteCreate[]);
		this.selectedIds = [];
	}

	/** Shift every given object's placement by a delta in the active state (one atomic write). */
	moveObjects(ids: string[], dx: number, dy: number, stateKey = this.activeState) {
		this.#mutateChildren((next) => {
			for (const sprite of next) {
				if (!ids.includes(sprite.id ?? '')) continue;
				const p = sprite.states?.[stateKey] as Record<string, number> | undefined;
				if (!p) continue;
				p.x = Math.round((p.x ?? 0) + dx);
				p.y = Math.round((p.y ?? 0) + dy);
			}
		});
	}

	addObject(type: SpriteType, at?: { x: number; y: number }): string {
		const sprite = createSprite(type, this.activeState);
		if (at) {
			const placement = sprite.states?.[this.activeState] as Record<string, number> | undefined;
			if (placement) {
				placement.x = at.x;
				placement.y = at.y;
			}
		}
		this.#mutateChildren(next => void next.push(sprite));
		this.selectedIds = sprite.id ? [sprite.id] : [];
		return sprite.id ?? '';
	}

	/** Append a batch of pre-built sprites (e.g. a behavior's generated prefab) and select them. */
	addObjects(sprites: SpriteCreate[]) {
		this.#mutateChildren((next) => {
			for (const sprite of sprites) next.push(sprite);
		});
		this.selectedIds = sprites.map(s => s.id).filter(Boolean) as string[];
	}

	deleteObject(id: string) {
		this.#setChildren((this.data.children ?? []).filter(c => c?.id !== id) as SpriteCreate[]);
		this.selectedIds = this.selectedIds.filter(x => x !== id);
	}

	duplicateObject(id: string) {
		const source = (this.data.children ?? []).find(c => c?.id === id);
		if (!source) return;
		const copy = foundry.utils.deepClone(source) as SpriteCreate;
		copy.id = nanoid();
		this.#mutateChildren(next => void next.push(copy));
		this.selectedIds = copy.id ? [copy.id] : [];
	}

	setObjectContent(id: string, patch: Record<string, unknown>) {
		this.#mutateChildren((next) => {
			const sprite = next.find(c => c?.id === id);
			if (sprite) foundry.utils.mergeObject(sprite, patch);
		});
	}

	// --- preset application (copy-on-apply; see utils/presets.ts) -------------

	/**
	 * Apply a button preset's STYLE to an existing button in ONE write: replace the label/image/variant/
	 * tint fields wholesale (so a null variant clears and no stale sub-keys linger). The target's `onClick`
	 * is deliberately PRESERVED — a preset carries a placeholder `close` action, and applying a *style*
	 * preset must not silently wipe the button's wired behaviour.
	 */
	applyButtonPreset(id: string, payload: Record<string, unknown>) {
		const STYLE_FIELDS = ['label', 'image', 'clickLabel', 'clickImage', 'hoverLabel', 'hoverImage', 'tint', 'hoverTint', 'clickTint'] as const;
		this.#mutateChildren((next) => {
			const sprite = next.find(c => c?.id === id) as Record<string, unknown> | undefined;
			if (!sprite) return;
			for (const key of STYLE_FIELDS) sprite[key] = payload[key];
		});
	}

	/** Spawn a new sprite from a sprite preset, placed in the active state, and select it. */
	applySpritePreset(sprite: SpriteCreate, at?: { x: number; y: number }): string {
		const placed = materializeSprite(sprite, this.activeState, at);
		this.#mutateChildren(next => void next.push(placed));
		this.selectedIds = placed.id ? [placed.id] : [];
		return placed.id ?? '';
	}

	/**
	 * Stamp a group prefab: preserve each sprite's arrangement (its `states`) and wiring (`onClick`),
	 * regenerate ids, and remap groupIds to fresh ones so the prefab's internal grouping survives without
	 * colliding with — or merging into — anything already in the splash. A prefab saved from loose objects
	 * (no groups) is wrapped into one fresh group so it lands as a cohesive unit.
	 */
	applySpriteGroupPreset(sprites: SpriteCreate[]) {
		const remap: Record<string, string> = {};
		const wrapper = sprites.every(s => !(s as { groupId?: string }).groupId) ? nanoid() : null;
		const placed = sprites.map((s) => {
			const copy = foundry.utils.deepClone(s) as Record<string, unknown>;
			copy.id = nanoid();
			if (!Array.isArray(copy.effects)) copy.effects = [];
			const gid = copy.groupId as string | null | undefined;
			copy.groupId = gid ? (remap[gid] ??= nanoid()) : wrapper;
			return copy as SpriteCreate;
		});
		// Second pass (remap fully populated): rewrite any groupId references the prefab carries in
		// `context` — e.g. a lock's Unlock button stores `Wheels: [groupId,…]`, which must follow the remap.
		const remapRef = (v: unknown) => (typeof v === 'string' && remap[v]) ? remap[v] : v;
		for (const p of placed) {
			const context = (p as { context?: Record<string, unknown> }).context;
			if (context && typeof context === 'object') {
				for (const [key, value] of Object.entries(context)) {
					context[key] = Array.isArray(value) ? value.map(remapRef) : remapRef(value);
				}
			}
		}
		this.#mutateChildren((next) => {
			for (const p of placed) next.push(p);
		});
		this.selectedIds = placed.map(p => p.id).filter(Boolean) as string[];
	}

	replaceObjectField(id: string, key: string, value: unknown) {
		this.#mutateChildren((next) => {
			const sprite = next.find(c => c?.id === id);
			if (sprite) (sprite as Record<string, unknown>)[key] = value;
		});
	}

	placeInState(id: string, stateKey = this.activeState, at?: { x: number; y: number }) {
		this.#mutateChildren((next) => {
			const sprite = next.find(c => c?.id === id);
			if (!sprite) return;
			sprite.states ??= {};
			(sprite.states as Record<string, unknown>)[stateKey] = { ...defaultPlacement(), ...(at ?? {}) };
		});
	}

	removeFromState(id: string, stateKey = this.activeState) {
		this.#mutateChildren((next) => {
			const states = next.find(c => c?.id === id)?.states as Record<string, unknown> | undefined;
			if (states) delete states[stateKey];
		});
	}

	setPlacement(id: string, patch: Record<string, unknown>, stateKey = this.activeState) {
		this.#mutateChildren((next) => {
			const placement = next.find(c => c?.id === id)?.states?.[stateKey];
			if (placement) foundry.utils.mergeObject(placement, patch);
		});
	}

	replacePlacementField(id: string, key: string, value: unknown, stateKey = this.activeState) {
		this.#mutateChildren((next) => {
			const placement = next.find(c => c?.id === id)?.states?.[stateKey] as Record<string, unknown> | undefined;
			if (placement) placement[key] = value;
		});
	}

	get stageW(): number {
		return this.data.layer === 'handout' ? (this.data.handoutSize?.width ?? 800) : (globalThis.innerWidth || 1920);
	}

	get stageH(): number {
		return this.data.layer === 'handout' ? (this.data.handoutSize?.height ?? 600) : (globalThis.innerHeight || 1080);
	}

	/** Fill the stage with the object. */
	scaleToFit(id: string) {
		this.setPlacement(id, { x: 0, y: 0, width: this.stageW, height: this.stageH });
	}

	/** Clear the explicit size so the object renders at its natural size. */
	resetSize(id: string) {
		this.setPlacement(id, { width: null, height: null });
	}

	zExtent(extreme: 'front' | 'back'): number {
		const zs = this.objectsInState.map(o => (o.placement?.zIndex as number) ?? 0);
		if (!zs.length) return 0;
		return extreme === 'front' ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
	}

	// --- state operations ----------------------------------------------------

	setActiveState(key: string) {
		this.activeState = key;
		this.selectedIds = [];
	}

	#freshStateKey(states: Record<string, unknown>): string {
		let key = 'state';
		let i = 1;
		while (states[key]) key = `state${i++}`;
		return key;
	}

	addState() {
		const states = foundry.utils.deepClone(this.data.states ?? {}) as Record<string, unknown>;
		const key = this.#freshStateKey(states);
		states[key] = { label: key, onEnter: [] };
		this.#setStates(states);
		this.setActiveState(key);
	}

	renameState(key: string, label: string) {
		const states = foundry.utils.deepClone(this.data.states ?? {}) as Record<string, { label?: string }>;
		if (states[key]) states[key] = { ...states[key], label };
		this.#setStates(states);
	}

	setStateOnEnter(actions: unknown[], key = this.activeState) {
		const states = foundry.utils.deepClone(this.data.states ?? {}) as Record<string, Record<string, unknown>>;
		if (states[key]) states[key] = { ...states[key], onEnter: actions };
		this.#setStates(states);
	}

	duplicateState(key: string) {
		const states = foundry.utils.deepClone(this.data.states ?? {}) as Record<string, { label?: string }>;
		const newKey = this.#freshStateKey(states);
		states[newKey] = { ...foundry.utils.deepClone(states[key] ?? {}), label: `${states[key]?.label || key} copy` };
		this.#setStates(states);
		this.#mutateChildren((next) => {
			for (const sprite of next) {
				const placement = sprite.states?.[key];
				if (placement) (sprite.states as Record<string, unknown>)[newKey] = foundry.utils.deepClone(placement);
			}
		});
		this.setActiveState(newKey);
	}

	deleteState(key: string) {
		if (Object.keys(this.data.states ?? {}).length <= 1) {
			ui.notifications?.warn('Splash | A splash needs at least one state.');
			return;
		}
		const states = foundry.utils.deepClone(this.data.states ?? {}) as Record<string, unknown>;
		delete states[key];
		this.#setStates(states);
		this.#mutateChildren((next) => {
			for (const sprite of next) {
				if (sprite.states?.[key]) delete (sprite.states as Record<string, unknown>)[key];
			}
		});
		this.setField('initialState', (this.data.initialState ?? []).filter(s => s !== key));
		if (this.activeState === key) this.setActiveState(Object.keys(states)[0]);
	}

	setSoleInitial(key: string) {
		this.setField('initialState', [key]);
	}

	toggleInitial(key: string, on: boolean) {
		const current = (this.data.initialState ?? []).filter(s => s !== key);
		if (on) current.push(key);
		this.setField('initialState', current);
	}
}
