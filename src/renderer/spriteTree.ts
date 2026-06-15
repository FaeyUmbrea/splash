import type { SpriteInitialized } from '../datamodel/SplashModel.ts';

/**
 * A node in the materialized sprite tree handed to inline macros. The flat `children` array + `groupId`
 * tags become a real hierarchy: root → (top-level sprites + one synthetic group node per groupId) →
 * grouped members. The triggering element's node is dropped into the macro as `scope`, so it navigates
 * relatively — `scope.parent.child.get("Top")` — and names (which survive prefab re-ids) are the address,
 * never sprite ids.
 */
export interface SpriteNode {
	/** Sprite id, or null for the synthetic root/group nodes. */
	id: string | null;
	/** The sprite's `name` (the addressable role within a group), or the groupId for a group node. */
	name: string;
	type: string;
	/** The underlying sprite, or null for root/group nodes. */
	sprite: SpriteInitialized | null;
	parent: SpriteNode | null;
	children: SpriteNode[];
	/** Lookup a direct child by name: `scope.parent.child.get("Top")`. */
	child: { get: (name: string) => SpriteNode | undefined };
	/** Free-form per-element context data (`{Keyword, Position, ...}`). */
	context: Record<string, unknown>;
	/** Live read of a property (override-then-data). Bound by the runtime at execution time. */
	get?: (property: string) => unknown;
	/** Live write of a property → an ephemeral synced override. Bound by the runtime. No-op for group/root. */
	set?: (property: string, value: unknown) => void;
	/** Sugar for get/set('text'), defined by the runtime so macros can do `node.text = "A"`. */
	text?: unknown;
}

export interface SpriteTree {
	root: SpriteNode;
	/** id → node, for O(1) location of the triggering element's `scope`. */
	byId: Map<string, SpriteNode>;
}

function makeNode(init: Partial<SpriteNode> & Pick<SpriteNode, 'id' | 'name' | 'type' | 'sprite' | 'parent'>): SpriteNode {
	const node: SpriteNode = {
		children: [],
		context: {},
		child: { get: () => undefined },
		...init,
	};
	node.child = { get: name => node.children.find(c => c.name === name) };
	return node;
}

/**
 * Build the navigable tree for a set of in-state sprites. Cheap and pure: call it once per loaded-state
 * composition (structure is fixed within a loaded state) and reuse it across macro invocations.
 */
export function buildSpriteTree(sprites: SpriteInitialized[]): SpriteTree {
	const byId = new Map<string, SpriteNode>();
	const root = makeNode({ id: null, name: 'root', type: 'root', sprite: null, parent: null });
	const groups = new Map<string, SpriteNode>();

	for (const sprite of sprites) {
		const node = makeNode({
			id: sprite.id ?? null,
			name: sprite.name ?? '',
			type: sprite.type ?? '',
			sprite,
			parent: root,
			context: (sprite.context as Record<string, unknown> | undefined) ?? {},
		});
		if (sprite.id) byId.set(sprite.id, node);

		const groupId = sprite.groupId ?? null;
		if (groupId) {
			let group = groups.get(groupId);
			if (!group) {
				group = makeNode({ id: null, name: groupId, type: 'group', sprite: null, parent: root });
				groups.set(groupId, group);
				root.children.push(group);
			}
			node.parent = group;
			group.children.push(node);
		} else {
			root.children.push(node);
		}
	}

	return { root, byId };
}
