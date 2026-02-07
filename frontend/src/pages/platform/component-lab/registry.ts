export type LabComponentStatus = "stable" | "beta" | "wip";

export type LabComponent = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  status: LabComponentStatus;
  previewNote?: string;
  exampleLoader?: () => Promise<{ default: unknown }>;
};

export const labComponents: LabComponent[] = [
  {
    id: "param-schema-editor",
    name: "ParameterSchema Editor",
    description: "Tree + Detail + Preview editor for ParameterSchema DSL with ops-based undo/redo.",
    tags: ["Editor", "Schema", "DSL"],
    status: "beta",
    previewNote: "Focus: ops-driven edits + validation pipeline.",
    exampleLoader: () => import("@/engines/param-schema/example/ParamSchemaEditorExample.vue"),
  },
];

export function getLabComponent(componentId: string) {
  return labComponents.find((component) => component.id === componentId) ?? null;
}
