import type { SchemaNode, SchemaPreviewValue } from "./types";

export function resolvePreview(node: SchemaNode): SchemaPreviewValue {
  if (node.value && node.value.content !== undefined) {
    return { source: "value", value: node.value.content };
  }
  if (node.default !== undefined) {
    return { source: "default", value: node.default };
  }
  return { source: "empty", value: undefined };
}
