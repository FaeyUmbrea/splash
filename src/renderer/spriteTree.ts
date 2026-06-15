import type { SpriteInitialized } from '../datamodel/SplashModel.ts';

/** A node in the sprite tree handed to inline macros. Navigation is by `name`, which survives prefab re-ids. */
export interface SpriteNode {
	/** Sprite id, or null for the synthetic root/group nodes. */
	id: string | null;
	/** The sprite's `name`, or the groupId for a group node. */
	name: string;
	type: string;
	/** The underlying sprite, or null for root/group nodes. */
	sprite: SpriteInitialized | null;
	parent: SpriteNode | null;
	children: SpriteNode[];
	child: { get: (name: string) => SpriteNode | undefined };
	context: Record<string, unknown>;
	/** Read a property, override-then-data. Bound by the runtime. */
	get?: (property: string) => unknown;
	/** Write a property as an ephemeral synced override. Bound by the runtime; no-op for group/root. */
	set?: (property: string, value: unknown) => void;
	text?: unknown;
}

export interface SpriteTree {
	root: SpriteNode;
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
