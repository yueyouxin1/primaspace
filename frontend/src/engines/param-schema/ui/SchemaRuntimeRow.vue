<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { SchemaIssue, SchemaNode, SchemaType } from "../core";
import Input from "@/components/ui/input/Input.vue";
import Switch from "@/components/ui/switch/Switch.vue";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Settings2, Trash2 } from "lucide-vue-next";
import {
  canEditFieldInMode,
  canMutateStructureInMode,
  type ParamSchemaRuntimeMode,
  type RuntimeColumnVisibility,
} from "./mode";

defineOptions({ name: "SchemaRuntimeRow" });

const props = defineProps<{
  node: SchemaNode;
  level: number;
  selectedId: string | null;
  mode: ParamSchemaRuntimeMode;
  columns: RuntimeColumnVisibility;
  rowTemplate: string;
  expandedIds: string[];
  issues: SchemaIssue[];
  canEdit?: (node: SchemaNode) => boolean;
}>();

const emit = defineEmits<{
  (event: "select", nodeId: string): void;
  (event: "toggle", nodeId: string): void;
  (event: "set-field", payload: { nodeId: string; field: keyof SchemaNode; value: unknown }): void;
  (event: "change-type", payload: { nodeId: string; nextType: SchemaType }): void;
  (event: "add-property", parentId: string): void;
  (event: "add-item", parentId: string): void;
  (event: "delete-node", nodeId: string): void;
  (event: "open-detail", nodeId: string): void;
}>();

const schemaTypes: SchemaType[] = ["string", "number", "integer", "boolean", "object", "array"];
const UNSET_VALUE = "__unset__";
const BOOLEAN_TRUE = "__true__";
const BOOLEAN_FALSE = "__false__";

const isSelected = computed(() => props.selectedId === props.node.id);
const isProperty = computed(() => props.node.kind === "property");
const isItem = computed(() => props.node.kind === "item");
const isAccessible = computed(() => (props.canEdit ? props.canEdit(props.node) : true));
const isExpanded = computed(() => props.expandedIds.includes(props.node.id));

const canEditName = computed(() => isProperty.value && isAccessible.value && canEditFieldInMode(props.mode, "name"));
const canEditType = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "type"));
const canEditDefault = computed(() => isAccessible.value && canEditFieldInMode(props.mode, "default"));
const canEditRequired = computed(
  () => isProperty.value && isAccessible.value && canEditFieldInMode(props.mode, "required"),
);
const canEditOpen = computed(() => isProperty.value && isAccessible.value && canEditFieldInMode(props.mode, "open"));
const canMutateStructure = computed(() => isAccessible.value && canMutateStructureInMode(props.mode));

const nodeIssues = computed(() => props.issues.filter((issue) => issue.nodeId === props.node.id));
const nodeIssueLevel = computed<"error" | "warning" | null>(() => {
  if (nodeIssues.value.some((issue) => issue.level === "error")) return "error";
  if (nodeIssues.value.some((issue) => issue.level === "warning")) return "warning";
  return null;
});

const children = computed(() => {
  if (props.node.type === "object") return props.node.children ?? [];
  if (props.node.type === "array" && props.node.item) return [props.node.item];
  return [];
});
const hasChildren = computed(() => children.value.length > 0);

const canAddChild = computed(() => {
  if (!canMutateStructure.value) return false;
  if (props.node.type === "object") return true;
  if (props.node.type === "array") return !props.node.item;
  return false;
});
const canDelete = computed(() => isProperty.value && canMutateStructure.value);

const rowLabel = computed(() => {
  if (isItem.value) return "items";
  return props.node.name ?? props.node.label ?? props.node.type;
});

const nameDraft = ref("");
const defaultDraft = ref("");
const defaultError = ref<string | null>(null);

const isBooleanType = computed(() => props.node.type === "boolean");
const isStringType = computed(() => props.node.type === "string");
const isNumberType = computed(() => props.node.type === "number" || props.node.type === "integer");
const canInlineEditDefault = computed(
  () => canEditDefault.value && (isStringType.value || isBooleanType.value || isNumberType.value),
);

const booleanDefaultValue = computed(() => {
  if (props.node.default === true) return BOOLEAN_TRUE;
  if (props.node.default === false) return BOOLEAN_FALSE;
  return UNSET_VALUE;
});

watch(
  () => [props.node.id, props.node.name, props.node.default, props.node.type] as const,
  () => {
    nameDraft.value = props.node.name ?? "";
    defaultDraft.value = formatDefault(props.node.default);
    defaultError.value = null;
  },
  { immediate: true },
);

function formatDefault(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function onSelectRow() {
  emit("select", props.node.id);
}

function onToggleExpand() {
  if (!hasChildren.value) return;
  emit("toggle", props.node.id);
}

function onAddChild() {
  if (!canAddChild.value) return;
  if (props.node.type === "object") {
    emit("add-property", props.node.id);
    if (!isExpanded.value) emit("toggle", props.node.id);
  } else if (props.node.type === "array") {
    emit("add-item", props.node.id);
    if (!isExpanded.value) emit("toggle", props.node.id);
  }
}

function onDeleteNode() {
  if (!canDelete.value) return;
  emit("delete-node", props.node.id);
}

function onOpenDetail() {
  emit("open-detail", props.node.id);
}

function onTypeChange(nextType: string) {
  if (!canEditType.value) return;
  if (!schemaTypes.includes(nextType as SchemaType)) return;
  emit("change-type", { nodeId: props.node.id, nextType: nextType as SchemaType });
}

function commitName() {
  if (!canEditName.value) return;
  emit("set-field", { nodeId: props.node.id, field: "name", value: nameDraft.value });
}

function commitDefault(raw: string) {
  if (!canInlineEditDefault.value) return;

  if (raw.trim() === "") {
    defaultError.value = null;
    emit("set-field", { nodeId: props.node.id, field: "default", value: undefined });
    return;
  }

  if (isStringType.value) {
    defaultError.value = null;
    emit("set-field", { nodeId: props.node.id, field: "default", value: raw });
    return;
  }

  if (isNumberType.value) {
    const numberValue = Number(raw);
    if (Number.isNaN(numberValue)) {
      defaultError.value = "Must be a number.";
      return;
    }
    defaultError.value = null;
    emit("set-field", {
      nodeId: props.node.id,
      field: "default",
      value: props.node.type === "integer" ? Math.trunc(numberValue) : numberValue,
    });
  }
}

function onBooleanDefaultChange(value: string) {
  if (!canEditDefault.value || !isBooleanType.value) return;
  defaultError.value = null;
  if (value === UNSET_VALUE) {
    emit("set-field", { nodeId: props.node.id, field: "default", value: undefined });
    return;
  }
  emit("set-field", { nodeId: props.node.id, field: "default", value: value === BOOLEAN_TRUE });
}

function onToggleRequired(checked: boolean) {
  if (!canEditRequired.value) return;
  emit("set-field", { nodeId: props.node.id, field: "required", value: checked });
}

function onToggleOpen(checked: boolean) {
  if (!canEditOpen.value) return;
  emit("set-field", { nodeId: props.node.id, field: "open", value: checked });
}

function onDefaultEnter(event: KeyboardEvent) {
  event.preventDefault();
  commitDefault(defaultDraft.value);
  (event.currentTarget as HTMLInputElement | null)?.blur();
}
</script>

<template>
  <div class="contents">
    <div
      :class="[
        'grid min-w-0 items-stretch',
        isSelected ? 'bg-accent/45' : 'hover:bg-accent/20',
      ]"
      :style="{ gridTemplateColumns: rowTemplate }"
      @click="onSelectRow"
    >
      <div class="flex min-w-0 items-center gap-1 border-b px-2 py-1.5" :style="{ paddingLeft: `${8 + level * 12}px` }">
        <button
          type="button"
          class="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          :disabled="!hasChildren"
          @click.stop="onToggleExpand"
        >
          <ChevronDown v-if="hasChildren && isExpanded" class="size-3.5" />
          <ChevronRight v-else-if="hasChildren" class="size-3.5" />
          <span v-else class="size-3.5" />
        </button>
        <Input
          v-if="isProperty"
          v-model="nameDraft"
          :disabled="!canEditName"
          class="h-7 min-w-0 px-2 text-xs"
          placeholder="param_name"
          @click.stop
          @focus="onSelectRow"
          @blur="commitName"
          @keydown.enter.prevent="commitName"
        />
        <span v-else class="truncate text-xs font-medium text-foreground" :title="rowLabel">{{ rowLabel }}</span>
        <span
          v-if="nodeIssueLevel"
          :class="[
            'ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
            nodeIssueLevel === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
          ]"
          :title="nodeIssues.map((issue) => issue.message).join('\n')"
        >
          {{ nodeIssues.length }}
        </span>
      </div>

      <div v-if="columns.type" class="border-b px-2 py-1.5" @click.stop>
        <Select :disabled="!canEditType" :model-value="node.type" @update:modelValue="onTypeChange(String($event))">
          <SelectTrigger class="h-7 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="type in schemaTypes" :key="type" :value="type">{{ type }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-if="columns.default" class="border-b px-2 py-1.5" @click.stop>
        <Input
          v-if="isStringType || isNumberType"
          v-model="defaultDraft"
          :disabled="!canInlineEditDefault"
          :placeholder="node.type === 'integer' ? '0' : node.type === 'number' ? '0.0' : 'Default'"
          class="h-7 text-xs"
          @focus="onSelectRow"
          @blur="commitDefault(defaultDraft)"
          @keydown.enter="onDefaultEnter"
        />
        <Select
          v-else-if="isBooleanType"
          :disabled="!canEditDefault"
          :model-value="booleanDefaultValue"
          @update:modelValue="onBooleanDefaultChange(String($event))"
        >
          <SelectTrigger class="h-7 text-xs">
            <SelectValue placeholder="Unset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="UNSET_VALUE">Unset</SelectItem>
            <SelectItem :value="BOOLEAN_TRUE">true</SelectItem>
            <SelectItem :value="BOOLEAN_FALSE">false</SelectItem>
          </SelectContent>
        </Select>
        <div v-else class="flex h-7 items-center rounded-md border border-dashed px-2 text-[11px] text-muted-foreground">
          Configure in details
        </div>
        <p v-if="defaultError" class="mt-1 text-[10px] text-red-600">{{ defaultError }}</p>
      </div>

      <div v-if="columns.required" class="flex items-center justify-center border-b px-2 py-1.5" @click.stop>
        <Switch
          v-if="isProperty"
          :checked="Boolean(node.required)"
          :disabled="!canEditRequired"
          @update:checked="onToggleRequired(Boolean($event))"
        />
        <span v-else class="text-[10px] text-muted-foreground">-</span>
      </div>

      <div v-if="columns.open" class="flex items-center justify-center border-b px-2 py-1.5" @click.stop>
        <Switch
          v-if="isProperty"
          :checked="node.open ?? true"
          :disabled="!canEditOpen"
          @update:checked="onToggleOpen(Boolean($event))"
        />
        <span v-else class="text-[10px] text-muted-foreground">-</span>
      </div>

      <div v-if="columns.actions" class="flex items-center justify-end gap-1 border-b px-2 py-1.5" @click.stop>
        <Button
          v-if="canAddChild"
          size="icon-sm"
          variant="ghost"
          class="size-7"
          :title="node.type === 'array' ? 'Add array item' : 'Add child property'"
          @click="onAddChild"
        >
          <Plus class="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          class="size-7"
          title="More settings"
          @click="onOpenDetail"
        >
          <Settings2 class="size-3.5" />
        </Button>
        <Button
          v-if="canDelete"
          size="icon-sm"
          variant="ghost"
          class="size-7 text-red-600 hover:bg-red-50 hover:text-red-700"
          title="Delete node"
          @click="onDeleteNode"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </div>

    <template v-if="hasChildren && isExpanded">
      <SchemaRuntimeRow
        v-for="child in children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :selected-id="selectedId"
        :mode="mode"
        :columns="columns"
        :row-template="rowTemplate"
        :expanded-ids="expandedIds"
        :issues="issues"
        :can-edit="canEdit"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @set-field="emit('set-field', $event)"
        @change-type="emit('change-type', $event)"
        @add-property="emit('add-property', $event)"
        @add-item="emit('add-item', $event)"
        @delete-node="emit('delete-node', $event)"
        @open-detail="emit('open-detail', $event)"
      />
    </template>
  </div>
</template>
