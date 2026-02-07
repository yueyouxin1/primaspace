import type { SchemaIssue, SchemaNode, SchemaType, SchemaValidationResult } from "./types";

export function validateTree(root: SchemaNode): SchemaValidationResult {
  const issues: SchemaIssue[] = [];
  const nameRegistry = new Map<string, Set<string>>();

  const visit = (node: SchemaNode, path: string) => {
    if (node.type === "object") {
      if (!node.children) {
        issues.push(issue("error", "object-missing-properties", "Object type requires properties.", node, path));
      } else {
        const seenNames = new Set<string>();
        nameRegistry.set(node.id, seenNames);
        node.children.forEach((child, index) => {
          const childPath = `${path}.properties[${index}]`;
          if (!child.name) {
            issues.push(issue("error", "property-name-missing", "Property name is required.", child, childPath));
          } else if (seenNames.has(child.name)) {
            issues.push(issue("error", "property-name-duplicate", `Duplicate property name: ${child.name}.`, child, childPath));
          } else {
            seenNames.add(child.name);
          }
          if (child.required === undefined) {
            issues.push(issue("error", "property-required-missing", "Property required flag is missing.", child, childPath));
          }
          if (child.open === undefined) {
            issues.push(issue("error", "property-open-missing", "Property open flag is missing.", child, childPath));
          }
          visit(child, childPath);
        });
      }
    }

    if (node.type === "array") {
      if (!node.item) {
        issues.push(issue("error", "array-missing-items", "Array type requires items.", node, path));
      } else {
        visit(node.item, `${path}.items`);
      }
    }

    if (node.enum && node.enum.length) {
      const enumMismatch = node.enum.some((value) => !matchesType(value, node.type));
      if (enumMismatch) {
        issues.push(issue("warning", "enum-type-mismatch", "Enum values do not match schema type.", node, path));
      }
    }

    if (node.value && node.value.type === "literal" && !matchesType(node.value.content, node.type)) {
      issues.push(issue("warning", "value-type-mismatch", "Literal value does not match schema type.", node, path));
    }
  };

  visit(root, "root");

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  return { issues, errors, warnings };
}

function issue(level: "error" | "warning", code: string, message: string, node: SchemaNode, path: string): SchemaIssue {
  return { level, code, message, nodeId: node.id, path };
}

function matchesType(value: unknown, type: SchemaType): boolean {
  if (value === null || value === undefined) return true;
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !Number.isNaN(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return typeof value === "object" && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    default:
      return true;
  }
}
