import type { SchemaNode, SchemaType } from "./types";
import { createRootNode, createSchemaNode, normalizeNode, stripPropertyFields } from "./node";
import { resolvePreview } from "./preview";

export type JsonSchema = {
  type?: SchemaType;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
};

export function exportJsonSchema(root: SchemaNode): JsonSchema {
  return toJsonSchema(root);
}

export function importJsonSchema(schema: JsonSchema): SchemaNode {
  if (schema.type === "object" || schema.properties) {
    const root = createRootNode();
    root.children = Object.entries(schema.properties ?? {}).map(([name, childSchema]) =>
      fromJsonSchema(childSchema, name, schema.required ?? []),
    );
    return normalizeNode(root);
  }

  const root = createRootNode();
  root.children = [fromJsonSchema(schema, "value", [])];
  return normalizeNode(root);
}

export function exportJsonValue(root: SchemaNode): unknown {
  return toJsonValue(root);
}

export function importJsonValue(value: unknown): SchemaNode {
  const root = createRootNode();
  if (isPlainObject(value)) {
    root.children = Object.entries(value).map(([key, val]) => fromJsonValue(val, key));
  } else {
    root.children = [fromJsonValue(value, "value")];
  }
  return normalizeNode(root);
}

function toJsonSchema(node: SchemaNode): JsonSchema {
  const schema: JsonSchema = {
    type: node.type,
    description: node.description,
    enum: node.enum,
    default: node.default,
  };
  if (node.value?.type === "literal" && node.value.content !== undefined) {
    schema.default = node.value.content;
  }

  if (node.type === "object") {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    (node.children ?? []).forEach((child) => {
      if (!child.name) return;
      properties[child.name] = toJsonSchema(child);
      if (child.required) required.push(child.name);
    });
    schema.properties = properties;
    if (required.length) schema.required = required;
  }

  if (node.type === "array" && node.item) {
    schema.items = toJsonSchema(node.item);
  }

  return schema;
}

function fromJsonSchema(schema: JsonSchema, name: string, requiredList: string[]): SchemaNode {
  const type = schema.type ?? inferTypeFromSchema(schema);
  const node = createSchemaNode({
    kind: "property",
    type,
    name,
    required: requiredList.includes(name),
    open: true,
    description: schema.description,
    enum: schema.enum,
    default: schema.default,
  });

  if (type === "object") {
    node.children = Object.entries(schema.properties ?? {}).map(([childName, childSchema]) =>
      fromJsonSchema(childSchema, childName, schema.required ?? []),
    );
  }

  if (type === "array" && schema.items) {
    const itemNode = fromJsonSchema(schema.items, "items", []);
    node.item = { ...stripPropertyFields(itemNode), kind: "item" };
  }

  return normalizeNode(node);
}

function fromJsonValue(value: unknown, name: string): SchemaNode {
  const type = inferTypeFromValue(value);
  const node = createSchemaNode({
    kind: "property",
    type,
    name,
    required: false,
    open: true,
    default: value,
  });
  if (node.default === undefined) {
    node.default = value;
  }

  if (type === "object" && isPlainObject(value)) {
    node.children = Object.entries(value).map(([childName, childValue]) => fromJsonValue(childValue, childName));
  }

  if (type === "array" && Array.isArray(value)) {
    const sample = value.length ? value[0] : "";
    const itemNode = fromJsonValue(sample, "items");
    node.item = { ...stripPropertyFields(itemNode), kind: "item" };
  }

  return normalizeNode(node);
}

function toJsonValue(node: SchemaNode): unknown {
  if (node.type === "object") {
    const obj: Record<string, unknown> = {};
    (node.children ?? []).forEach((child) => {
      if (!child.name) return;
      obj[child.name] = toJsonValue(child);
    });
    return obj;
  }

  if (node.type === "array") {
    if (!node.item) return [];
    return [toJsonValue(node.item)];
  }

  const preview = resolvePreview(node);
  return preview.value;
}

function inferTypeFromValue(value: unknown): SchemaType {
  if (Array.isArray(value)) return "array";
  if (value === null) return "string";
  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return Number.isInteger(value) ? "integer" : "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "string";
  }
}

function inferTypeFromSchema(schema: JsonSchema): SchemaType {
  if (schema.properties) return "object";
  if (schema.items) return "array";
  return "string";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
