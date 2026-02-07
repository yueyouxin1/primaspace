<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SchemaEditorAction, SchemaEditorState, SchemaIssue, SchemaNode, SchemaType } from "../core";
import {
  createAddPropertyOp,
  createChangeTypeOp,
  createMoveNodeOp,
  createSchemaNode,
  createRemoveNodeOp,
  createSetFieldOp,
  createUnwrapArrayOp,
  createWrapArrayOp,
  exportJsonSchema,
  exportJsonValue,
  exportParameterSchema,
  findNodeById,
  findParentInfo,
  importJsonSchema,
  importJsonValue,
  importParameterSchema,
  validateTree,
} from "../core";
import SchemaTreePanel from "./SchemaTreePanel.vue";
import SchemaDetailPanel from "./SchemaDetailPanel.vue";
import SchemaRuntimePanel from "./SchemaRuntimePanel.vue";
import { canEditFieldInMode, canMutateStructureInMode, type ParamSchemaRuntimeMode } from "./mode";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonacoEditor } from "@/components/ui/monaco";
import IdManager from "@/lib/id-manager";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLanguageSelector,
  CodeBlockLanguageSelectorContent,
  CodeBlockLanguageSelectorItem,
  CodeBlockLanguageSelectorTrigger,
  CodeBlockLanguageSelectorValue,
} from "@/components/ai-elements/code-block";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertCircle, Code, Plus, Redo2, Trash2, Undo2, Upload } from "lucide-vue-next";

type ParamSchemaEditorMode = "regular" | "professional";

const props = withDefaults(
  defineProps<{
    state: SchemaEditorState;
    dispatch: (action: SchemaEditorAction) => void;
    canEdit?: (node: SchemaNode) => boolean;
    roleOptions?: string[];
    defaultMode?: ParamSchemaEditorMode;
    allowModeSwitch?: boolean;
    runtimeMode?: ParamSchemaRuntimeMode;
  }>(),
  {
    defaultMode: "regular",
    allowModeSwitch: true,
    runtimeMode: "define",
  },
);

const selectedNode = computed(() =>
  props.state.selection.nodeId ? findNodeById(props.state.tree, props.state.selection.nodeId) : null,
);
const addTarget = computed(() =>
  selectedNode.value && selectedNode.value.type === "object" ? selectedNode.value : props.state.tree,
);
function canAccessNode(node: SchemaNode) {
  return props.canEdit ? props.canEdit(node) : true;
}

function canMutateStructure(node: SchemaNode) {
  return canAccessNode(node) && canMutateStructureInMode(runtimeMode.value);
}

function canEditField(node: SchemaNode, field: Parameters<typeof canEditFieldInMode>[1]) {
  return canAccessNode(node) && canEditFieldInMode(runtimeMode.value, field);
}

const canAddProperty = computed(() => canMutateStructure(addTarget.value));
const canDeleteSelected = computed(() => {
  const node = selectedNode.value;
  if (!node || node.kind === "root" || node.kind === "item") return false;
  return canMutateStructure(node);
});

const validation = computed(() => validateTree(props.state.tree));
const localIssues = ref<SchemaIssue[]>([]);
const combinedErrors = computed(() => [...validation.value.errors, ...localIssues.value]);
const combinedWarnings = computed(() => validation.value.warnings);
const allIssues = computed(() => [...combinedErrors.value, ...combinedWarnings.value]);
const editorMode = ref<ParamSchemaEditorMode>(props.defaultMode);
const isProfessionalMode = computed(() => editorMode.value === "professional");
const runtimeMode = computed<ParamSchemaRuntimeMode>(() => props.runtimeMode);
const isCodeView = ref(true);
const isDetailOpen = ref(false);
const isPreviewOpen = ref(false);
const activeExport = ref<"parameter" | "json-schema" | "json">("parameter");
const isImportOpen = ref(false);
const importMode = ref<"parameter" | "json-schema" | "json">("json-schema");
const importText = ref("");
const importError = ref<string | null>(null);
const canUndo = computed(() => props.state.undoStack.length > 0);
const canRedo = computed(() => props.state.redoStack.length > 0);
const containerRef = ref<HTMLElement | null>(null);
const isDetailInline = ref(true);
const isPreviewInline = ref(true);
const canOpenCodePreview = computed(() => !isProfessionalMode.value || !isPreviewInline.value);
let resizeObserver: ResizeObserver | null = null;
const nameIdManager = new IdManager({ idKey: "uid", onDuplicate: "reassign" });

function onSelect(nodeId: string) {
  props.dispatch({ type: "select", nodeId });
}

function onOpenDetail(nodeId?: string) {
  if (nodeId) onSelect(nodeId);
  isDetailOpen.value = true;
}

function onSetField(payload: { nodeId: string; field: keyof SchemaNode; value: unknown }) {
  const node = findNodeById(props.state.tree, payload.nodeId);
  if (!node) return;
  if (!canEditField(node, payload.field as Parameters<typeof canEditFieldInMode>[1])) return;

  if (payload.field === "name" && typeof payload.value === "string") {
    const trimmed = payload.value.trim();
    if (node.kind !== "property") return;
    if (node.name === trimmed) return;
    const info = findParentInfo(props.state.tree, payload.nodeId);
    if (info.parent?.children) {
      const hasDuplicate = info.parent.children.some(
        (child) => child.id !== payload.nodeId && child.name === trimmed,
      );
      if (hasDuplicate) {
        const issue: SchemaIssue = {
          level: "error",
          code: "property-name-duplicate",
          message: `Duplicate property name: ${trimmed}.`,
          nodeId: payload.nodeId,
          path: "",
        };
        localIssues.value = [
          ...localIssues.value.filter((item) => item.nodeId !== payload.nodeId || item.code !== issue.code),
          issue,
        ];
        return;
      }
    }
    localIssues.value = localIssues.value.filter(
      (item) => item.nodeId !== payload.nodeId || item.code !== "property-name-duplicate",
    );
    payload = { ...payload, value: trimmed };
  }
  const op = createSetFieldOp(props.state.tree, payload.nodeId, payload.field, payload.value);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onChangeType(payload: { nodeId: string; nextType: SchemaType }) {
  const node = findNodeById(props.state.tree, payload.nodeId);
  if (!node || node.type === payload.nextType) return;
  if (!canEditField(node, "type")) return;
  const op = createChangeTypeOp(props.state.tree, payload.nodeId, payload.nextType, "stash");
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onWrapArray(payload: { nodeId: string }) {
  const node = findNodeById(props.state.tree, payload.nodeId);
  if (!node || !canEditField(node, "type")) return;
  const op = createWrapArrayOp(props.state.tree, payload.nodeId);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onUnwrapArray(payload: { nodeId: string }) {
  const node = findNodeById(props.state.tree, payload.nodeId);
  if (!node || !canEditField(node, "type")) return;
  const op = createUnwrapArrayOp(props.state.tree, payload.nodeId);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onAddProperty(parentId?: string) {
  const fallback = props.state.tree;
  const node = parentId ? findNodeById(props.state.tree, parentId) : selectedNode.value ?? fallback;
  if (!node || node.type !== "object") return;
  if (!canMutateStructure(node)) return;
  const nameId = allocateNameId(props.state.tree);
  const name = `param_${nameId}`;
  const child = createSchemaNode({
    kind: "property",
    type: "string",
    name,
    uid: nameId,
    required: false,
    open: true,
  });
  const op = createAddPropertyOp(node.id, child);
  props.dispatch({ type: "apply", op });
}

function onDeleteNode(nodeId?: string) {
  const node = nodeId ? findNodeById(props.state.tree, nodeId) : selectedNode.value;
  if (!node || node.kind === "root" || node.kind === "item") return;
  if (!canMutateStructure(node)) return;
  const op = createRemoveNodeOp(props.state.tree, node.id);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onAddItem(parentId: string) {
  const node = findNodeById(props.state.tree, parentId);
  if (!node || node.type !== "array") return;
  if (!canMutateStructure(node)) return;
  const itemNode = createSchemaNode({ kind: "item", type: "string" });
  const op = createSetFieldOp(props.state.tree, parentId, "item", itemNode);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function onMoveNode(payload: { nodeId: string; parentId: string; index: number }) {
  const movingNode = findNodeById(props.state.tree, payload.nodeId);
  const parentNode = findNodeById(props.state.tree, payload.parentId);
  if (!movingNode || !parentNode) return;
  if (!canMutateStructure(movingNode) || !canMutateStructure(parentNode)) return;
  const op = createMoveNodeOp(props.state.tree, payload.nodeId, payload.parentId, payload.index);
  if (!op) return;
  props.dispatch({ type: "apply", op });
}

function openImport(mode: "parameter" | "json-schema" | "json") {
  importMode.value = mode;
  importText.value = "";
  importError.value = null;
  isImportOpen.value = true;
}

function applyImport() {
  try {
    const parsed = JSON.parse(importText.value);
    const nextTree =
      importMode.value === "parameter"
        ? importParameterSchema(parsed)
        : importMode.value === "json-schema"
          ? importJsonSchema(parsed)
          : importJsonValue(parsed);
    initUidTree(nextTree);
    props.dispatch({ type: "reset", tree: nextTree });
    localIssues.value = collectGlobalNameIssues(nextTree);
    isImportOpen.value = false;
  } catch (error) {
    importError.value = error instanceof Error ? error.message : "Invalid JSON";
  }
}

const parameterSchemaJson = computed(() =>
  isCodeView.value ? JSON.stringify(exportParameterSchema(props.state.tree), null, 2) : "",
);
const jsonSchemaJson = computed(() => (isCodeView.value ? JSON.stringify(exportJsonSchema(props.state.tree), null, 2) : ""));
const jsonValueJson = computed(() => (isCodeView.value ? JSON.stringify(exportJsonValue(props.state.tree), null, 2) : ""));

const activeExportText = computed(() => {
  switch (activeExport.value) {
    case "json":
      return jsonValueJson.value;
    case "json-schema":
      return jsonSchemaJson.value;
    default:
      return parameterSchemaJson.value;
  }
});

const exportOptions: { value: "parameter" | "json-schema" | "json"; label: string }[] = [
  { value: "parameter", label: "ParameterSchema" },
  { value: "json-schema", label: "JSON Schema" },
  { value: "json", label: "JSON" },
];

const activeFilename = computed(() => {
  switch (activeExport.value) {
    case "json":
      return "data.json";
    case "json-schema":
      return "schema.json";
    default:
      return "parameter-schema.json";
  }
});

function generateUniqueName(node: SchemaNode): string {
  const existing = new Set((node.children ?? []).map((child) => child.name).filter(Boolean) as string[]);
  let index = existing.size + 1;
  let candidate = `param_${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `param_${index}`;
  }
  return candidate;
}

function collectGlobalNameIssues(root?: SchemaNode | null): SchemaIssue[] {
  if (!root) return [];
  const nameMap = new Map<string, string[]>();

  const walk = (node: SchemaNode) => {
    if (!node || typeof node !== "object") return;
    if (node.kind === "property" && node.name && node.id) {
      const list = nameMap.get(node.name) ?? [];
      list.push(node.id);
      nameMap.set(node.name, list);
    }
    if (node.children?.length) {
      for (const child of node.children) walk(child);
    }
    if (node.item) walk(node.item);
  };

  walk(root);

  const issues: SchemaIssue[] = [];
  for (const [name, ids] of nameMap.entries()) {
    if (ids.length < 2) continue;
    for (const nodeId of ids) {
      issues.push({
        level: "error",
        code: "property-name-duplicate-global",
        message: `Duplicate property name across tree: ${name}.`,
        nodeId,
        path: "",
      });
    }
  }
  return issues;
}

function initUidTree(root: SchemaNode) {
  const originalChildren = new Map<SchemaNode, SchemaNode[] | undefined>();
  const stack: SchemaNode[] = [root];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    originalChildren.set(node, node.children);
    const merged: SchemaNode[] = [];
    if (node.children?.length) merged.push(...node.children);
    if (node.item) merged.push(node.item);
    node.children = merged.length ? merged : undefined;
    if (node.children?.length) {
      for (const child of node.children) stack.push(child);
    }
  }

  try {
    const seeds = root.children ?? [];
    nameIdManager.init(seeds, { mutate: true });
  } finally {
    for (const [node, children] of originalChildren.entries()) {
      node.children = children;
    }
  }
}

function allocateNameId(root: SchemaNode): number {
  initUidTree(root);
  return nameIdManager.allocate();
}

function updateInlineLayout(width: number) {
  isDetailInline.value = width >= 720;
  isPreviewInline.value = width >= 1120;
}

onMounted(() => {
  if (!containerRef.value || typeof ResizeObserver === "undefined") return;
  updateInlineLayout(containerRef.value.clientWidth);
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    updateInlineLayout(entry.contentRect.width);
  });
  resizeObserver.observe(containerRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

const gridLayoutClass = computed(() => {
  if (!isDetailInline.value) return "grid-cols-1";
  if (isPreviewInline.value) {
    return "grid-cols-[minmax(160px,24%)_minmax(320px,1fr)_minmax(220px,26%)]";
  }
  return "grid-cols-[minmax(160px,28%)_minmax(320px,1fr)]";
});

watch(
  () => props.defaultMode,
  (nextMode) => {
    if (!nextMode || editorMode.value === nextMode) return;
    editorMode.value = nextMode;
  },
);

watch(
  () => [props.state.tree, props.state.selection.nodeId] as const,
  () => {
    if (props.state.selection.nodeId) return;
    const root = props.state.tree;
    const first = root.children?.[0] ?? null;
    if (first) {
      props.dispatch({ type: "select", nodeId: first.id });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div ref="containerRef" class="flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-md border bg-card">
    <TooltipProvider>
      <div class="flex items-center justify-between border-b px-3 py-2">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-foreground">ParameterSchema Editor</span>
          <div v-if="allowModeSwitch" class="ml-1 inline-flex items-center rounded-md border bg-muted/30 p-0.5">
            <Button
              size="sm"
              class="h-7 px-2 text-xs"
              :variant="editorMode === 'regular' ? 'default' : 'ghost'"
              @click="editorMode = 'regular'"
            >
              Regular
            </Button>
            <Button
              size="sm"
              class="h-7 px-2 text-xs"
              :variant="editorMode === 'professional' ? 'default' : 'ghost'"
              @click="editorMode = 'professional'"
            >
              Pro
            </Button>
          </div>
          <Tooltip v-if="combinedErrors.length || combinedWarnings.length">
            <TooltipTrigger as-child>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-xs text-red-600 hover:bg-red-50"
              >
                <AlertCircle class="size-4" />
                <span class="font-semibold">{{ combinedErrors.length }}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" class="max-w-[360px]">
              <div class="space-y-2 text-xs">
                <div v-if="combinedErrors.length" class="space-y-1">
                  <div class="font-semibold">Errors</div>
                  <div v-for="issue in combinedErrors" :key="issue.code + issue.nodeId + issue.path">
                    {{ issue.message }}
                  </div>
                </div>
                <div v-if="combinedWarnings.length" class="space-y-1">
                  <div class="font-semibold text-amber-700">Warnings</div>
                  <div v-for="issue in combinedWarnings" :key="issue.code + issue.nodeId + issue.path">
                    {{ issue.message }}
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <div class="flex items-center gap-1 text-muted-foreground">
          <Button
            v-if="(isProfessionalMode && !isDetailInline) || (!isProfessionalMode && selectedNode)"
            size="sm"
            variant="ghost"
            @click="onOpenDetail()"
          >
            Details
          </Button>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="icon-sm" variant="ghost" :disabled="!canAddProperty" aria-label="Add property" @click="onAddProperty()">
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Add property</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="icon-sm" variant="ghost" :disabled="!canDeleteSelected" aria-label="Delete selection" @click="onDeleteNode()">
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete selection</TooltipContent>
          </Tooltip>
          <div class="mx-1 h-4 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button size="icon-sm" variant="ghost" aria-label="Import">
                <Upload />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @select="openImport('parameter')">Import ParameterSchema</DropdownMenuItem>
              <DropdownMenuItem @select="openImport('json')">Import JSON</DropdownMenuItem>
              <DropdownMenuItem @select="openImport('json-schema')">Import JSON Schema</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="icon-sm" variant="ghost" :disabled="!canUndo" aria-label="Undo" @click="props.dispatch({ type: 'undo' })">
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="icon-sm" variant="ghost" :disabled="!canRedo" aria-label="Redo" @click="props.dispatch({ type: 'redo' })">
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Redo</TooltipContent>
          </Tooltip>
          <div class="mx-1 h-4 w-px bg-border" />
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Open code view"
                :disabled="!canOpenCodePreview"
                @click="canOpenCodePreview ? (isPreviewOpen = true) : undefined"
              >
                <Code />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Code</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
    <div v-if="isProfessionalMode" :class="['grid min-h-0 flex-1 overflow-hidden', gridLayoutClass]">
      <div class="min-h-0">
        <SchemaTreePanel
          :root="state.tree"
          :selected-id="state.selection.nodeId"
          :can-edit="canMutateStructure"
          @select="onSelect"
          @add-property="onAddProperty"
          @add-item="onAddItem"
          @delete-node="onDeleteNode"
          @move-node="onMoveNode"
        />
      </div>
      <div v-if="isDetailInline" class="min-h-0">
        <SchemaDetailPanel
          :node="selectedNode"
          :can-edit="canAccessNode"
          :mode="runtimeMode"
          :role-options="roleOptions"
          class="min-h-0"
          @set-field="onSetField"
          @change-type="onChangeType"
          @wrap-array="onWrapArray"
          @unwrap-array="onUnwrapArray"
        />
      </div>
      <div v-if="isPreviewInline" class="flex min-h-0 flex-col border-l bg-background">
        <div class="flex-1 min-h-0 overflow-hidden p-3">
          <div class="h-full min-h-0 overflow-auto">
            <CodeBlock :code="activeExportText" language="json" class="min-h-0 text-xs">
              <CodeBlockHeader>
                <CodeBlockActions>
                  <CodeBlockLanguageSelector v-model="activeExport">
                    <CodeBlockLanguageSelectorTrigger>
                      <CodeBlockLanguageSelectorValue />
                    </CodeBlockLanguageSelectorTrigger>
                    <CodeBlockLanguageSelectorContent>
                      <CodeBlockLanguageSelectorItem
                        v-for="option in exportOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </CodeBlockLanguageSelectorItem>
                    </CodeBlockLanguageSelectorContent>
                  </CodeBlockLanguageSelector>
                  <CodeBlockCopyButton />
                </CodeBlockActions>
              </CodeBlockHeader>
            </CodeBlock>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="min-h-0 flex-1 overflow-hidden">
      <SchemaRuntimePanel
        :root="state.tree"
        :selected-id="state.selection.nodeId"
        :issues="allIssues"
        :can-edit="canAccessNode"
        :mode="runtimeMode"
        @select="onSelect"
        @set-field="onSetField"
        @change-type="onChangeType"
        @add-property="onAddProperty"
        @add-item="onAddItem"
        @delete-node="onDeleteNode"
        @open-detail="onOpenDetail"
      />
    </div>

    <Dialog v-model:open="isImportOpen">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            Import
            {{
              importMode === "parameter"
                ? "ParameterSchema"
                : importMode === "json-schema"
                  ? "JSON Schema"
                  : "JSON"
            }}
          </DialogTitle>
          <DialogDescription>Paste a JSON payload to generate a new schema tree.</DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <MonacoEditor v-model="importText" language="json" height="260px" />
          <p v-if="importError" class="text-xs text-red-600">{{ importError }}</p>
        </div>
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" @click="isImportOpen = false">Cancel</Button>
          <Button type="button" size="sm" @click="applyImport">Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="isDetailOpen">
      <DialogContent class="h-[80vh] max-h-[80vh] overflow-hidden sm:max-w-[720px]">
        <SchemaDetailPanel
          :node="selectedNode"
          :can-edit="canAccessNode"
          :mode="runtimeMode"
          :role-options="roleOptions"
          @set-field="onSetField"
          @change-type="onChangeType"
          @wrap-array="onWrapArray"
          @unwrap-array="onUnwrapArray"
        />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="isPreviewOpen">
      <DialogContent class="h-[80vh] max-h-[80vh] overflow-hidden sm:max-w-[720px]">
        <div class="flex h-full min-h-0 flex-col bg-background">
          <div class="flex-1 min-h-0 overflow-hidden p-3">
            <CodeBlock
              :code="activeExportText"
              language="json"
              class="flex h-full min-h-0 flex-col text-xs [content-visibility:visible] [contain:none]"
            >
              <CodeBlockHeader>
                <CodeBlockActions>
                  <CodeBlockLanguageSelector v-model="activeExport">
                    <CodeBlockLanguageSelectorTrigger>
                      <CodeBlockLanguageSelectorValue />
                    </CodeBlockLanguageSelectorTrigger>
                    <CodeBlockLanguageSelectorContent>
                      <CodeBlockLanguageSelectorItem
                        v-for="option in exportOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </CodeBlockLanguageSelectorItem>
                    </CodeBlockLanguageSelectorContent>
                  </CodeBlockLanguageSelector>
                  <CodeBlockCopyButton />
                </CodeBlockActions>
              </CodeBlockHeader>
            </CodeBlock>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
