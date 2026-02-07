import type { SchemaNode, SchemaNodeKind, SchemaTree, SchemaType } from "./types";

const FALLBACK_ID_PREFIX = "ps";

export function createSchemaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2);
  const time = Date.now().toString(16);
  return `${FALLBACK_ID_PREFIX}_${time}_${random}`;
}

export function createSchemaNode(
  partial: Partial<SchemaNode> & Pick<SchemaNode, "type" | "kind">,
): SchemaNode {
  return normalizeNode({
    id: createSchemaId(),
    children: [],
    item: null,
    ...partial,
  });
}

export function cloneNode(node: SchemaNode): SchemaNode {
  return {
    ...node,
    enum: node.enum ? [...node.enum] : undefined,
    value: node.value ? { ...node.value } : undefined,
    meta: node.meta ? { ...node.meta } : undefined,
    children: node.children ? node.children.map(cloneNode) : undefined,
    item: node.item ? cloneNode(node.item) : node.item ?? undefined,
  };
}

export function normalizeNode(node: SchemaNode): SchemaNode {
  const normalized: SchemaNode = { ...node };
  if (normalized.type === "object") {
    normalized.children = normalized.children ?? [];
    normalized.item = null;
  }
  if (normalized.type === "array") {
    normalized.item = normalized.item ?? null;
    normalized.children = undefined;
  }
  if (normalized.type !== "object" && normalized.type !== "array") {
    normalized.children = undefined;
    normalized.item = null;
  }
  return normalized;
}

export function createRootNode(): SchemaNode {
  return createSchemaNode({ kind: "root", type: "object" });
}

export function findNodeById(root: SchemaNode, nodeId: string): SchemaNode | null {
  if (root.id === nodeId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  if (root.item) {
    return findNodeById(root.item, nodeId);
  }
  return null;
}

export interface ParentInfo {
  parent: SchemaNode | null;
  index: number;
  relation: "children" | "item" | null;
}

export function findParentInfo(root: SchemaNode, nodeId: string): ParentInfo {
  if (root.children) {
    const index = root.children.findIndex((child) => child.id === nodeId);
    if (index >= 0) {
      return { parent: root, index, relation: "children" };
    }
    for (const child of root.children) {
      const info = findParentInfo(child, nodeId);
      if (info.parent) return info;
    }
  }
  if (root.item) {
    if (root.item.id === nodeId) {
      return { parent: root, index: 0, relation: "item" };
    }
    return findParentInfo(root.item, nodeId);
  }
  return { parent: null, index: -1, relation: null };
}

export function updateNode(root: SchemaNode, nodeId: string, updater: (node: SchemaNode) => SchemaNode): SchemaNode {
  if (root.id === nodeId) {
    return normalizeNode(updater(cloneNode(root)));
  }
  if (root.children) {
    let changed = false;
    const nextChildren = root.children.map((child) => {
      const next = updateNode(child, nodeId, updater);
      if (next !== child) changed = true;
      return next;
    });
    if (changed) {
      return normalizeNode({ ...root, children: nextChildren });
    }
  }
  if (root.item) {
    const nextItem = updateNode(root.item, nodeId, updater);
    if (nextItem !== root.item) {
      return normalizeNode({ ...root, item: nextItem });
    }
  }
  return root;
}

export function updateTree(root: SchemaNode, updater: (node: SchemaNode) => SchemaNode): SchemaNode {
  return normalizeNode(updater(cloneNode(root)));
}

export function replaceNode(root: SchemaNode, nodeId: string, nextNode: SchemaNode): SchemaNode {
  return updateNode(root, nodeId, () => nextNode);
}

export function ensureItemNode(item: SchemaNode | null, defaultType: SchemaType = "string"): SchemaNode {
  if (item) return item;
  return createSchemaNode({ kind: "item", type: defaultType });
}

export function stripPropertyFields(node: SchemaNode): SchemaNode {
  const { name, required, open, role, label, ...rest } = node;
  return { ...rest, name: undefined, required: undefined, open: undefined, role: undefined, label: undefined };
}

export function pickSchemaFields(node: SchemaNode): SchemaNode {
  return {
    id: node.id,
    kind: node.kind,
    type: node.type,
    uid: node.uid,
    description: node.description,
    enum: node.enum,
    default: node.default,
    value: node.value,
    meta: node.meta,
    children: node.children,
    item: node.item,
  };
}

export function ensurePropertyDefaults(node: SchemaNode): SchemaNode {
  if (node.kind !== "property") return node;
  return {
    ...node,
    required: node.required ?? false,
    open: node.open ?? true,
  };
}

export function createTree(root?: SchemaNode): SchemaTree {
  return { root: root ?? createRootNode() };
}
