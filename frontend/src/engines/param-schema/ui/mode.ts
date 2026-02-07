export type ParamSchemaRuntimeMode = "define" | "refine" | "bind" | "default" | "read";
export type SchemaEditorDensity = "compact" | "balanced" | "full";

export type SchemaEditableField =
  | "name"
  | "type"
  | "label"
  | "description"
  | "required"
  | "open"
  | "role"
  | "default"
  | "enum"
  | "meta"
  | "value";

export interface RuntimeColumnVisibility {
  name: boolean;
  type: boolean;
  default: boolean;
  required: boolean;
  open: boolean;
  actions: boolean;
}

export function canMutateStructureInMode(mode: ParamSchemaRuntimeMode): boolean {
  return mode === "define" || mode === "refine";
}

export function canEditFieldInMode(mode: ParamSchemaRuntimeMode, field: SchemaEditableField): boolean {
  if (mode === "read") return false;

  if (mode === "define") return true;

  if (mode === "default") {
    return field === "default";
  }

  if (mode === "bind") {
    return field === "value";
  }

  if (mode === "refine") {
    return field === "name" || field === "value";
  }

  return false;
}

export function resolveRuntimeColumns(
  mode: ParamSchemaRuntimeMode,
  density: SchemaEditorDensity,
): RuntimeColumnVisibility {
  if (mode === "refine") {
    return {
      name: true,
      type: false,
      default: false,
      required: false,
      open: false,
      actions: true,
    };
  }

  if (mode === "bind") {
    return {
      name: true,
      type: density !== "compact",
      default: false,
      required: false,
      open: false,
      actions: true,
    };
  }

  if (mode === "default") {
    return {
      name: true,
      type: density !== "compact",
      default: true,
      required: false,
      open: false,
      actions: true,
    };
  }

  if (mode === "read") {
    return {
      name: true,
      type: true,
      default: density !== "compact",
      required: false,
      open: false,
      actions: false,
    };
  }

  if (density === "compact") {
    return {
      name: true,
      type: true,
      default: false,
      required: false,
      open: false,
      actions: true,
    };
  }

  if (density === "balanced") {
    return {
      name: true,
      type: true,
      default: true,
      required: false,
      open: false,
      actions: true,
    };
  }

  return {
    name: true,
    type: true,
    default: true,
    required: true,
    open: true,
    actions: true,
  };
}
