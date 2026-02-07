import type { SchemaNode, SchemaType } from "./types";
import {
  cloneNode,
  ensureItemNode,
  findNodeById,
  findParentInfo,
  normalizeNode,
  replaceNode,
  stripPropertyFields,
  updateNode,
} from "./node";

export type SchemaOp =
  | AddPropertyOp
  | RemoveNodeOp
  | MoveNodeOp
  | SetFieldOp
  | ReplaceNodeOp
  | ChangeTypeOp
  | WrapArrayOp
  | UnwrapArrayOp;

export interface AddPropertyOp {
  type: "add_property";
  parentId: string;
  index?: number;
  node: SchemaNode;
}

export interface RemoveNodeOp {
  type: "remove_node";
  nodeId: string;
  parentId?: string;
  index?: number;
  snapshot?: SchemaNode;
}

export interface MoveNodeOp {
  type: "move_node";
  nodeId: string;
  parentId: string;
  index: number;
  fromParentId?: string;
  fromIndex?: number;
}

export interface SetFieldOp {
  type: "set_field";
  nodeId: string;
  field: keyof SchemaNode;
  value: unknown;
  prev?: unknown;
}

export interface ReplaceNodeOp {
  type: "replace_node";
  nodeId: string;
  nextNode: SchemaNode;
  prev?: SchemaNode;
}

export interface ChangeTypeOp {
  type: "change_type";
  nodeId: string;
  nextType: SchemaType;
  prev?: SchemaNode;
  policy?: "discard" | "stash";
}

export interface WrapArrayOp {
  type: "wrap_array";
  nodeId: string;
  prev?: SchemaNode;
}

export interface UnwrapArrayOp {
  type: "unwrap_array";
  nodeId: string;
  prev?: SchemaNode;
}

export function applyOp(root: SchemaNode, op: SchemaOp): SchemaNode {
  switch (op.type) {
    case "add_property": {
      return updateNode(root, op.parentId, (parent) => {
        if (parent.type !== "object") return parent;
        const children = parent.children ? [...parent.children] : [];
        const index = op.index ?? children.length;
        children.splice(index, 0, normalizeNode(cloneNode(op.node)));
        return { ...parent, children };
      });
    }
    case "remove_node": {
      const info = findParentInfo(root, op.nodeId);
      if (!info.parent) return root;
      if (info.relation === "children") {
        return updateNode(root, info.parent.id, (parent) => {
          if (!parent.children) return parent;
          const nextChildren = parent.children.filter((child) => child.id !== op.nodeId);
          return { ...parent, children: nextChildren };
        });
      }
      if (info.relation === "item") {
        return updateNode(root, info.parent.id, (parent) => ({ ...parent, item: null }));
      }
      return root;
    }
    case "move_node": {
      const { parentId, index, nodeId } = op;
      const info = findParentInfo(root, nodeId);
      if (!info.parent || info.relation !== "children") return root;
      const targetParent = findNodeById(root, parentId);
      if (!targetParent || targetParent.type !== "object") return root;
      let nextRoot = root;
      const node = info.parent.children?.[info.index];
      if (!node) return root;
      nextRoot = updateNode(nextRoot, info.parent.id, (parent) => {
        if (!parent.children) return parent;
        const nextChildren = parent.children.filter((child) => child.id !== nodeId);
        return { ...parent, children: nextChildren };
      });
      nextRoot = updateNode(nextRoot, parentId, (parent) => {
        if (parent.type !== "object") return parent;
        const children = parent.children ? [...parent.children] : [];
        const clampedIndex = Math.min(Math.max(index, 0), children.length);
        children.splice(clampedIndex, 0, node);
        return { ...parent, children };
      });
      return nextRoot;
    }
    case "set_field": {
      return updateNode(root, op.nodeId, (node) => ({ ...node, [op.field]: op.value }));
    }
    case "replace_node": {
      return replaceNode(root, op.nodeId, normalizeNode(cloneNode(op.nextNode)));
    }
    case "change_type": {
      return updateNode(root, op.nodeId, (node) => applyTypeChange(node, op.nextType, op.policy));
    }
    case "wrap_array": {
      return updateNode(root, op.nodeId, (node) => wrapArrayNode(node));
    }
    case "unwrap_array": {
      return updateNode(root, op.nodeId, (node) => unwrapArrayNode(node));
    }
    default:
      return root;
  }
}

export function invertOp(root: SchemaNode, op: SchemaOp): SchemaOp | null {
  switch (op.type) {
    case "add_property":
      return { type: "remove_node", nodeId: op.node.id, parentId: op.parentId };
    case "remove_node":
      if (!op.snapshot || !op.parentId) return null;
      if (op.snapshot.kind === "item") {
        return { type: "set_field", nodeId: op.parentId, field: "item", value: op.snapshot };
      }
      return { type: "add_property", parentId: op.parentId, index: op.index, node: op.snapshot };
    case "move_node": {
      if (!op.fromParentId || op.fromIndex === undefined) return null;
      return { type: "move_node", nodeId: op.nodeId, parentId: op.fromParentId, index: op.fromIndex };
    }
    case "set_field":
      return { type: "set_field", nodeId: op.nodeId, field: op.field, value: op.prev };
    case "replace_node":
      if (!op.prev) return null;
      return { type: "replace_node", nodeId: op.nodeId, nextNode: op.prev };
    case "change_type":
      if (!op.prev) return null;
      return { type: "replace_node", nodeId: op.nodeId, nextNode: op.prev };
    case "wrap_array":
      if (!op.prev) return null;
      return { type: "replace_node", nodeId: op.nodeId, nextNode: op.prev };
    case "unwrap_array":
      if (!op.prev) return null;
      return { type: "replace_node", nodeId: op.nodeId, nextNode: op.prev };
    default:
      return null;
  }
}

export function createAddPropertyOp(parentId: string, node: SchemaNode, index?: number): AddPropertyOp {
  return { type: "add_property", parentId, index, node };
}

export function createRemoveNodeOp(root: SchemaNode, nodeId: string): RemoveNodeOp | null {
  const info = findParentInfo(root, nodeId);
  if (!info.parent) return null;
  const snapshot =
    info.relation === "children" ? info.parent.children?.[info.index] : info.relation === "item" ? info.parent.item : null;
  if (!snapshot) return null;
  return {
    type: "remove_node",
    nodeId,
    parentId: info.parent.id,
    index: info.index,
    snapshot: cloneNode(snapshot),
  };
}

export function createMoveNodeOp(root: SchemaNode, nodeId: string, parentId: string, index: number): MoveNodeOp | null {
  const info = findParentInfo(root, nodeId);
  if (!info.parent || info.relation !== "children") return null;
  return {
    type: "move_node",
    nodeId,
    parentId,
    index,
    fromParentId: info.parent.id,
    fromIndex: info.index,
  };
}

export function createSetFieldOp(
  root: SchemaNode,
  nodeId: string,
  field: keyof SchemaNode,
  value: unknown,
): SetFieldOp | null {
  const node = findNodeById(root, nodeId);
  if (!node) return null;
  return { type: "set_field", nodeId, field, value, prev: (node as SchemaNode)[field] };
}

export function createReplaceNodeOp(root: SchemaNode, nodeId: string, nextNode: SchemaNode): ReplaceNodeOp | null {
  const node = findNodeById(root, nodeId);
  if (!node) return null;
  return { type: "replace_node", nodeId, nextNode: cloneNode(nextNode), prev: cloneNode(node) };
}

export function createChangeTypeOp(
  root: SchemaNode,
  nodeId: string,
  nextType: SchemaType,
  policy: "discard" | "stash" = "stash",
): ChangeTypeOp | null {
  const node = findNodeById(root, nodeId);
  if (!node) return null;
  return { type: "change_type", nodeId, nextType, prev: cloneNode(node), policy };
}

export function createWrapArrayOp(root: SchemaNode, nodeId: string): WrapArrayOp | null {
  const node = findNodeById(root, nodeId);
  if (!node) return null;
  return { type: "wrap_array", nodeId, prev: cloneNode(node) };
}

export function createUnwrapArrayOp(root: SchemaNode, nodeId: string): UnwrapArrayOp | null {
  const node = findNodeById(root, nodeId);
  if (!node) return null;
  return { type: "unwrap_array", nodeId, prev: cloneNode(node) };
}

function applyTypeChange(node: SchemaNode, nextType: SchemaType, policy: "discard" | "stash" = "stash"): SchemaNode {
  let next: SchemaNode = { ...node, type: nextType };
  if (nextType === "object") {
    return normalizeNode(sanitizeNodeForType({ ...next, children: node.children ?? [] }, nextType));
  }
  if (nextType === "array") {
    return normalizeNode(sanitizeNodeForType({ ...next, item: ensureItemNode(node.item) }, nextType));
  }
  if (policy === "stash" && (node.children?.length || node.item)) {
    const meta = node.meta ? { ...node.meta } : {};
    meta.__stash = { children: node.children ?? null, item: node.item ?? null };
    next.meta = meta;
  }
  next = sanitizeNodeForType(next, nextType);
  return normalizeNode(next);
}

function sanitizeNodeForType(node: SchemaNode, nextType: SchemaType): SchemaNode {
  const next: SchemaNode = { ...node };
  if (next.default !== undefined) {
    const coerced = coerceValue(next.default, nextType);
    next.default = coerced;
  }
  if (next.enum) {
    const coercedEnum = next.enum
      .map((entry) => coerceValue(entry, nextType))
      .filter((entry) => entry !== undefined);
    next.enum = coercedEnum.length ? coercedEnum : undefined;
  }
  if (next.value?.type === "literal") {
    const coerced = coerceValue(next.value.content, nextType);
    if (coerced === undefined) {
      next.value = undefined;
    } else {
      next.value = { ...next.value, content: coerced };
    }
  }
  return next;
}

function coerceValue(value: unknown, nextType: SchemaType): unknown | undefined {
  if (value === undefined) return undefined;
  switch (nextType) {
    case "string":
      return typeof value === "string" ? value : undefined;
    case "boolean": {
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      return undefined;
    }
    case "number": {
      if (typeof value === "number" && !Number.isNaN(value)) return value;
      if (typeof value === "string" && value.trim() !== "") {
        const num = Number(value);
        return Number.isNaN(num) ? undefined : num;
      }
      return undefined;
    }
    case "integer": {
      if (typeof value === "number" && !Number.isNaN(value)) return Math.trunc(value);
      if (typeof value === "string" && value.trim() !== "") {
        const num = Number(value);
        return Number.isNaN(num) ? undefined : Math.trunc(num);
      }
      return undefined;
    }
    case "object":
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
      return undefined;
    case "array":
      return Array.isArray(value) ? value : undefined;
    default:
      return undefined;
  }
}

function wrapArrayNode(node: SchemaNode): SchemaNode {
  if (node.type === "array") return node;
  const itemNode = stripPropertyFields(cloneNode(node));
  return normalizeNode({
    ...node,
    type: "array",
    item: ensureItemNode({ ...itemNode, kind: "item" }),
    children: undefined,
  });
}

function unwrapArrayNode(node: SchemaNode): SchemaNode {
  if (node.type !== "array" || !node.item) return node;
  const item = node.item;
  const restored: SchemaNode = {
    ...node,
    type: item.type,
    uid: item.uid ?? node.uid,
    description: item.description ?? node.description,
    enum: item.enum ?? node.enum,
    default: item.default ?? node.default,
    value: item.value ?? node.value,
    meta: item.meta ?? node.meta,
    children: item.children,
    item: item.item ?? null,
  };
  return normalizeNode(restored);
}
