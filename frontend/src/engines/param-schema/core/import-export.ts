import type { ParameterSchema, SchemaBlueprint, SchemaNode } from "./types";
import { createRootNode, createSchemaNode, ensurePropertyDefaults, normalizeNode } from "./node";

export function importParameterSchema(parameters: ParameterSchema[]): SchemaNode {
  const root = createRootNode();
  root.children = parameters.map((param) => fromParameter(param));
  return normalizeNode(root);
}

export function exportParameterSchema(root: SchemaNode): ParameterSchema[] {
  if (root.type !== "object" || !root.children) return [];
  return root.children.map((child) => toParameter(child));
}

export function fromParameter(parameter: ParameterSchema): SchemaNode {
  const node = createSchemaNode({
    kind: "property",
    type: parameter.type,
    uid: parameter.uid,
    name: parameter.name,
    required: parameter.required,
    open: parameter.open,
    role: parameter.role,
    label: parameter.label,
    description: parameter.description,
    enum: parameter.enum,
    default: parameter.default,
    value: parameter.value,
    meta: parameter.meta,
  });

  if (parameter.type === "object") {
    node.children = (parameter.properties ?? []).map((child) => fromParameter(child));
  }

  if (parameter.type === "array") {
    node.item = parameter.items ? fromBlueprint(parameter.items) : null;
  }

  return normalizeNode(ensurePropertyDefaults(node));
}

export function fromBlueprint(blueprint: SchemaBlueprint): SchemaNode {
  const node = createSchemaNode({
    kind: "item",
    type: blueprint.type,
    uid: blueprint.uid,
    description: blueprint.description,
    enum: blueprint.enum,
    default: blueprint.default,
  });

  if (blueprint.type === "object") {
    node.children = (blueprint.properties ?? []).map((child) => fromParameter(child));
  }

  if (blueprint.type === "array") {
    node.item = blueprint.items ? fromBlueprint(blueprint.items) : null;
  }

  return normalizeNode(node);
}

export function toParameter(node: SchemaNode): ParameterSchema {
  const parameter: ParameterSchema = {
    type: node.type,
    uid: node.uid,
    name: node.name ?? "",
    required: node.required ?? false,
    open: node.open ?? true,
    role: node.role,
    label: node.label,
    description: node.description,
    enum: node.enum,
    default: node.default,
    value: node.value,
    meta: node.meta,
  };

  if (node.type === "object") {
    parameter.properties = (node.children ?? []).map((child) => toParameter(child));
  }

  if (node.type === "array") {
    parameter.items = node.item ? toBlueprint(node.item) : undefined;
  }

  return parameter;
}

export function toBlueprint(node: SchemaNode): SchemaBlueprint {
  const blueprint: SchemaBlueprint = {
    type: node.type,
    uid: node.uid,
    description: node.description,
    enum: node.enum,
    default: node.default,
  };

  if (node.type === "object") {
    blueprint.properties = (node.children ?? []).map((child) => toParameter(child));
  }

  if (node.type === "array") {
    blueprint.items = node.item ? toBlueprint(node.item) : undefined;
  }

  return blueprint;
}
