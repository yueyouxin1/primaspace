<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SchemaIssue, SchemaNode, SchemaType } from "../core";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-vue-next";
import SchemaRuntimeRow from "./SchemaRuntimeRow.vue";
import {
  canMutateStructureInMode,
  resolveRuntimeColumns,
  type ParamSchemaRuntimeMode,
  type SchemaEditorDensity,
} from "./mode";

const props = withDefaults(
  defineProps<{
    root: SchemaNode;
    selectedId: string | null;
    issues: SchemaIssue[];
    canEdit?: (node: SchemaNode) => boolean;
    mode?: ParamSchemaRuntimeMode;
  }>(),
  {
    mode: "define",
  },
);

const emit = defineEmits<{
  (event: "select", nodeId: string): void;
  (event: "set-field", payload: { nodeId: string; field: keyof SchemaNode; value: unknown }): void;
  (event: "change-type", payload: { nodeId: string; nextType: SchemaType }): void;
  (event: "add-property", parentId: string): void;
  (event: "add-item", parentId: string): void;
  (event: "delete-node", nodeId: string): void;
  (event: "open-detail", nodeId: string): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const density = ref<SchemaEditorDensity>("full");
const expandedIds = ref<string[]>([]);
let resizeObserver: ResizeObserver | null = null;

const rootChildren = computed(() => props.root.children ?? []);
const columns = computed(() => resolveRuntimeColumns(props.mode, density.value));
const canAddRoot = computed(() => {
  if (!canMutateStructureInMode(props.mode)) return false;
  return props.canEdit ? props.canEdit(props.root) : true;
});

const trackByColumn = {
  name: "minmax(240px,1.4fr)",
  type: "minmax(120px,130px)",
  default: "minmax(160px,1fr)",
  required: "68px",
  open: "68px",
  actions: "auto",
} as const;

const orderedColumns: Array<keyof typeof trackByColumn> = [
  "name",
  "type",
  "default",
  "required",
  "open",
  "actions",
];

const visibleColumns = computed(() => orderedColumns.filter((key) => columns.value[key]));

const headerLabelByColumn: Record<keyof typeof trackByColumn, string> = {
  name: "Name",
  type: "Type",
  default: "Default",
  required: "Req",
  open: "Open",
  actions: "Actions",
};

const rowTemplate = computed(() => visibleColumns.value.map((key) => trackByColumn[key]).join(" "));

watch(
  () => props.root,
  (root) => {
    const validExpandable = collectExpandableIds(root);
    const previous = new Set(expandedIds.value.filter((id) => validExpandable.has(id)));
    if (!previous.size) {
      const nextExpanded: string[] = [];
      collectDefaultExpanded(root, 0, nextExpanded);
      expandedIds.value = nextExpanded;
      return;
    }
    expandedIds.value = [...previous];
  },
  { deep: true, immediate: true },
);

watch(
  () => props.selectedId,
  (selectedId) => {
    if (!selectedId) return;
    const path = findPathToNode(props.root, selectedId);
    if (!path.length) return;
    const next = new Set(expandedIds.value);
    path.forEach((nodeId) => {
      if (nodeId !== selectedId) next.add(nodeId);
    });
    expandedIds.value = [...next];
  },
  { immediate: true },
);

onMounted(() => {
  if (!containerRef.value || typeof ResizeObserver === "undefined") return;
  updateDensity(containerRef.value.clientWidth);
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    updateDensity(entry.contentRect.width);
  });
  resizeObserver.observe(containerRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

function updateDensity(width: number) {
  if (width < 640) {
    density.value = "compact";
    return;
  }
  if (width < 980) {
    density.value = "balanced";
    return;
  }
  density.value = "full";
}

function onToggle(nodeId: string) {
  const next = new Set(expandedIds.value);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  expandedIds.value = [...next];
}

function onAddRootProperty() {
  if (!canAddRoot.value) return;
  emit("add-property", props.root.id);
}

function collectExpandableIds(node: SchemaNode, bag = new Set<string>()) {
  if (node.type === "object" || node.type === "array") bag.add(node.id);
  if (node.children?.length) {
    node.children.forEach((child) => collectExpandableIds(child, bag));
  }
  if (node.item) collectExpandableIds(node.item, bag);
  return bag;
}

function collectDefaultExpanded(node: SchemaNode, level: number, bag: string[]) {
  if ((node.type === "object" || node.type === "array") && level <= 1) {
    bag.push(node.id);
  }
  if (node.children?.length) {
    node.children.forEach((child) => collectDefaultExpanded(child, level + 1, bag));
  }
  if (node.item) collectDefaultExpanded(node.item, level + 1, bag);
}

function findPathToNode(root: SchemaNode, targetId: string): string[] {
  const path: string[] = [];

  const walk = (node: SchemaNode): boolean => {
    path.push(node.id);
    if (node.id === targetId) return true;
    if (node.children?.length) {
      for (const child of node.children) {
        if (walk(child)) return true;
      }
    }
    if (node.item && walk(node.item)) return true;
    path.pop();
    return false;
  };

  return walk(root) ? path : [];
}
</script>

<template>
  <div ref="containerRef" class="flex h-full min-h-0 flex-col bg-background">
    <div class="border-b bg-muted/20 px-2 py-1.5">
      <div
        class="grid items-center gap-0.5 text-[11px] font-semibold text-muted-foreground"
        :style="{ gridTemplateColumns: rowTemplate }"
      >
        <div
          v-for="column in visibleColumns"
          :key="column"
          :class="[
            'px-2',
            column === 'required' || column === 'open' ? 'text-center' : '',
            column === 'actions' ? 'text-right' : '',
          ]"
        >
          <template v-if="column === 'actions' && canMutateStructureInMode(props.mode)">
            <Button
              size="icon-sm"
              variant="ghost"
              class="ml-auto size-7"
              :disabled="!canAddRoot"
              aria-label="Add root property"
              title="Add root property"
              @click="onAddRootProperty"
            >
              <Plus class="size-3.5" />
            </Button>
          </template>
          <template v-else>
            {{ headerLabelByColumn[column] }}
          </template>
        </div>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <div v-if="!rootChildren.length" class="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 px-4">
        <p class="text-sm text-muted-foreground">No properties yet.</p>
        <Button size="sm" variant="outline" :disabled="!canAddRoot" @click="onAddRootProperty">Add first property</Button>
      </div>
      <div v-else class="min-w-max">
        <SchemaRuntimeRow
          v-for="child in rootChildren"
          :key="child.id"
          :node="child"
          :level="0"
          :selected-id="selectedId"
          :mode="props.mode"
          :columns="columns"
          :row-template="rowTemplate"
          :expanded-ids="expandedIds"
          :issues="issues"
          :can-edit="canEdit"
          @select="emit('select', $event)"
          @toggle="onToggle"
          @set-field="emit('set-field', $event)"
          @change-type="emit('change-type', $event)"
          @add-property="emit('add-property', $event)"
          @add-item="emit('add-item', $event)"
          @delete-node="emit('delete-node', $event)"
          @open-detail="emit('open-detail', $event)"
        />
      </div>
    </div>
  </div>
</template>
