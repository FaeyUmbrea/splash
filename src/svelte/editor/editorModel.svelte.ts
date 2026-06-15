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

/** A group of objects shown as one collapsible node in the object list. */
export interface EditorGroupNode {
	kind: 'group';
	groupId: string;
	/** A friendly display label (groups are anonymous in the data, so this is positional). */
	name: string;
	members: EditorObject[];
	/** True when ANY member is placed in the active state. */
	inState: boolean;
}
export interface EditorLeafNode {
	kind: 'object';
	object: EditorObject;
}
/** One row of the object tree: a loose object or a group, in child order. */
export type EditorTreeNode = EditorGroupNode | EditorLeafNode;

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
 * The editor's conceptual layer over the splash data model — objects, states, selection, "place this object
 * in this state" — never exposing raw `sprite.states[k].x` to the UI. Writes are optimistic-then-atomic via
 * the DocumentStore.
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

	/**
	 * The object list as a tree: loose objects and groups in child order, each group carrying its members.
	 * A group node appears at the position of its first member, so the tree mirrors the flat z-order.
	 */
	readonly objectTree = $derived.by<EditorTreeNode[]>(() => {
		const nodes: EditorTreeNode[] = [];
		const byGroup: Record<string, EditorGroupNode> = {};
		let count = 0;
		for (const o of this.objects) {
			const gid = (o.raw as { groupId?: string | null }).groupId ?? null;
			if (!gid) {
				nodes.push({ kind: 'object', object: o });
				continue;
			}
			let group = byGroup[gid];
			if (!group) {
				const stored = (this.data.groups as Record<string, { name?: string }> | undefined)?.[gid]?.name;
				group = { kind: 'group', groupId: gid, name: stored || `Group ${++count}`, members: [], inState: false };
				byGroup[gid] = group;
				nodes.push(group);
			}
			group.members.push(o);
		}
		for (const group of Object.values(byGroup)) group.inState = group.members.some(m => m.inState);
		return nodes;
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
			// `==` replaces the whole array while the rest of `system` merges normally. NOT `{recursive:false}`,
			// which would replace all of `system` and reset layer/states/pins (the "move reverts type" bug).
			() => this.page.update({ 'system.==children': children }),
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
			// `==` replaces the whole states map; see `#setChildren` on why not `{recursive:false}`.
			() => this.page.update({ 'system.==states': states }),
		);
	}

	setField(path: string, value: unknown, replace = false) {
		// `replace` overwrites this one field wholesale via the `==` leaf-prefix (or `-=` to clear with null);
		// `==`+null is a no-op, hence the split. Not `{recursive:false}`, which would reset all of `system`.
		const clearing = replace && value === null;
		let key = `system.${path}`;
		if (replace) key = clearing ? `system.${path.replace(/([^.]+)$/, '-=$1')}` : `system.${path.replace(/([^.]+)$/, '==$1')}`;
		this.store.write(
			// A `-=` delete omits the key, so the mirror must delete too — setting null would look like an
			// external edit and record a phantom undo step.
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

	/** Every member id of one group. */
	#groupMemberIds(groupId: string): string[] {
		return (this.data.children ?? []).filter(c => (c as SpriteCreate)?.groupId === groupId).map(c => c?.id).filter(Boolean) as string[];
	}

	/** Set a group's display name (editor metadata under `system.groups`). Blank clears it. */
	renameGroup(groupId: string, name: string) {
		const groups = foundry.utils.deepClone(this.data.groups ?? {}) as Record<string, { name: string }>;
		const trimmed = name.trim();
		if (trimmed) groups[groupId] = { name: trimmed };
		else delete groups[groupId];
		// Replace the whole map (so a cleared name's key actually drops, not merged back in).
		this.setField('groups', groups, true);
	}

	/** Dissolve one specific group (the object-tree header action), independent of the selection. */
	ungroupGroup(groupId: string) {
		this.#mutateChildren((next) => {
			for (const sprite of next) {
				if (sprite.groupId === groupId) sprite.groupId = null;
			}
		});
		if (this.activeGroup === groupId) this.activeGroup = null;
	}

	/** Delete a whole group and all its members. */
	deleteGroup(groupId: string) {
		const ids = this.#groupMemberIds(groupId);
		this.#setChildren((this.data.children ?? []).filter(c => (c as SpriteCreate)?.groupId !== groupId) as SpriteCreate[]);
		this.selectedIds = this.selectedIds.filter(x => !ids.includes(x));
		if (this.activeGroup === groupId) this.activeGroup = null;
	}

	/** Place or remove every member of a group in a state, in one write. */
	setGroupInState(groupId: string, inState: boolean, stateKey = this.activeState) {
		this.#mutateChildren((next) => {
			for (const sprite of next) {
				if (sprite.groupId !== groupId) continue;
				const states = (sprite.states ??= {}) as Record<string, unknown>;
				if (inState) states[stateKey] ??= defaultPlacement();
				else delete states[stateKey];
			}
		});
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
	 * Apply a button preset's style fields wholesale to an existing button. The target's `onClick` is
	 * preserved — a style preset must not wipe the button's wired behaviour.
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
	 * Stamp a group prefab: keep each sprite's arrangement and wiring, regenerate ids, and remap groupIds to
	 * fresh ones so the prefab doesn't collide with or merge into existing groups. A prefab of loose objects
	 * is wrapped in one fresh group so it lands as a unit.
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
			// Re-key the prefab's arrangement onto the active state: a prefab's own state id means nothing
			// here, so its placement would land under a key this splash never reads (an invisible drop).
			const states = (copy.states ?? {}) as Record<string, unknown>;
			const placement = Object.values(states)[0];
			copy.states = placement ? { [this.activeState]: placement } : {};
			return copy as SpriteCreate;
		});
		// Second pass: rewrite groupId references the prefab stores in `context` (e.g. a lock's Unlock button
		// holds `Wheels: [groupId,…]`) to follow the remap.
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
