<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { SchemaNode } from "../core";
import { findNodeById, findParentInfo } from "../core";
import { TreeItem, TreeRoot, TreeVirtualizer } from "reka-ui";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-vue-next";

type DropPosition = "before" | "after";

const props = withDefaults(
  defineProps<{
    root: SchemaNode;
    selectedId: string | null;
    rowHeight?: number;
    canEdit?: (node: SchemaNode) => boolean;
  }>(),
  { rowHeight: 30 },
);

const emit = defineEmits<{
  (event: "select", nodeId: string): void;
  (event: "add-property", parentId: string): void;
  (event: "add-item", parentId: string): void;
  (event: "delete-node", nodeId: string): void;
  (event: "move-node", payload: { nodeId: string; parentId: string; index: number }): void;
}>();

const expanded = ref<string[]>([]);
const draggingId = ref<string | null>(null);
const dropTarget = ref<{ id: string; position: DropPosition } | null>(null);

const treeItems = computed(() => props.root.children ?? []);
const selectedNode = computed(() =>
  props.selectedId ? findNodeById(props.root, props.selectedId) ?? undefined : undefined,
);

watch(
  () => props.root.id,
  (nextId) => {
    if (!expanded.value.includes(nextId)) {
      expanded.value = [nextId, ...expanded.value];
    }
  },
  { immediate: true },
);

watch(
  () => {
    const node = selectedNode.value;
    if (!node) return "";
    const childCount =
      node.type === "object" ? node.children?.length ?? 0 : node.type === "array" && node.item ? 1 : 0;
    return `${node.id}:${childCount}`;
  },
  () => {
    const node = selectedNode.value;
    if (!node) return;
    const hasChild =
      node.type === "object" ? (node.children?.length ?? 0) > 0 : node.type === "array" ? Boolean(node.item) : false;
    if (hasChild && !expanded.value.includes(node.id)) {
      expanded.value = [...expanded.value, node.id];
    }
  },
);

const getKey = (node: SchemaNode) => node.id;
const getChildren = (node: SchemaNode) => {
  if (node.type === "object") return node.children && node.children.length ? node.children : undefined;
  if (node.type === "array") return node.item ? [node.item] : undefined;
  return undefined;
};

function buildLabel(node: SchemaNode): string {
  if (node.kind === "root") return "root";
  if (node.kind === "item") return "items";
  if (node.name) return node.name;
  if (node.label) return node.label;
  return node.type;
}

function isEditable(node: SchemaNode) {
  return props.canEdit ? props.canEdit(node) : true;
}

function isDraggable(node: SchemaNode) {
  return node.kind === "property" && isEditable(node);
}

function canDrop(dragId: string, targetId: string) {
  if (dragId === targetId) return false;
  const dragNode = findNodeById(props.root, dragId);
  const targetInfo = findParentInfo(props.root, targetId);
  if (!dragNode || !targetInfo.parent || targetInfo.relation !== "children") return false;
  if (props.canEdit && !props.canEdit(targetInfo.parent)) return false;
  if (targetInfo.parent.id === dragId) return false;
  if (isDescendant(dragNode, targetInfo.parent.id)) return false;
  return true;
}

function isDescendant(node: SchemaNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  if (node.children) {
    for (const child of node.children) {
      if (isDescendant(child, targetId)) return true;
    }
  }
  if (node.item && isDescendant(node.item, targetId)) return true;
  return false;
}

function onSelect(nodeId: string) {
  emit("select", nodeId);
}

function onAddChild(node: SchemaNode) {
  if (!isEditable(node)) return;
  if (!expanded.value.includes(node.id)) {
    expanded.value = [...expanded.value, node.id];
  }
  if (node.type === "object") emit("add-property", node.id);
  if (node.type === "array" && !node.item) emit("add-item", node.id);
}

function onDelete(node: SchemaNode) {
  if (node.kind === "root" || node.kind === "item") return;
  if (!isEditable(node)) return;
  emit("delete-node", node.id);
}

function canAddChild(node: SchemaNode) {
  if (!isEditable(node)) return false;
  if (node.type === "object") return true;
  if (node.type === "array") return !node.item;
  return false;
}

function onDragStart(event: DragEvent, node: SchemaNode) {
  if (!isDraggable(node)) return;
  draggingId.value = node.id;
  dropTarget.value = null;
  event.dataTransfer?.setData("text/plain", node.id);
  event.dataTransfer?.setDragImage?.((event.currentTarget as HTMLElement) ?? new Image(), 0, 0);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function onDragOver(event: DragEvent, node: SchemaNode) {
  const dragId = draggingId.value;
  if (!dragId || !canDrop(dragId, node.id)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const position: DropPosition = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
  dropTarget.value = { id: node.id, position };
}

function onDrop(event: DragEvent, target: SchemaNode) {
  const dragId = draggingId.value;
  if (!dragId || !canDrop(dragId, target.id)) return;
  event.preventDefault();
  const info = findParentInfo(props.root, target.id);
  if (!info.parent || info.relation !== "children") return;
  const position = dropTarget.value?.position ?? "after";
  const dragInfo = findParentInfo(props.root, dragId);
  if (!dragInfo.parent || dragInfo.relation !== "children") return;
  let index = info.index + (position === "after" ? 1 : 0);
  if (dragInfo.parent.id === info.parent.id && dragInfo.index < index) index -= 1;
  emit("move-node", { nodeId: dragId, parentId: info.parent.id, index });
  draggingId.value = null;
  dropTarget.value = null;
}

function onDragEnd() {
  draggingId.value = null;
  dropTarget.value = null;
}
</script>

<template>
  <TooltipProvider>
    <div class="flex h-full min-h-0 flex-col border-r bg-background">
      <div class="flex items-center justify-between border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Schema Tree</span>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="icon-sm"
              variant="ghost"
              :disabled="!isEditable(root)"
              aria-label="Add root property"
              @click="onAddChild(root)"
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add root property</TooltipContent>
        </Tooltip>
      </div>
      <TreeRoot
        class="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-1 py-1"
        :items="treeItems"
        :get-key="getKey"
        :get-children="getChildren"
        :model-value="selectedNode"
        :expanded="expanded"
        as="div"
        @update:modelValue="($event) => $event && onSelect(($event as SchemaNode).id)"
        @update:expanded="expanded = $event"
      >
        <div v-if="!treeItems.length" class="px-2 py-3 text-xs text-muted-foreground">
          No properties yet.
        </div>
        <TreeVirtualizer :estimate-size="rowHeight" :overscan="10" :text-content="(item) => buildLabel(item.value)">
          <template #default="{ item }">
            <TreeItem v-bind="item.bind" class="block min-w-max">
              <template #default="{ isExpanded, isSelected, handleToggle, handleSelect }">
                <div
                  :class="cn(
                    'group flex min-w-max items-center gap-1.5 rounded-md px-1.5 text-sm transition',
                    'cursor-pointer hover:bg-accent/40 hover:text-foreground',
                    isSelected && 'bg-accent/60 text-foreground',
                    draggingId === item.value.id && 'opacity-50',
                    dropTarget?.id === item.value.id && 'ring-2 ring-primary/60',
                  )"
                  :style="{ height: `${rowHeight}px`, paddingLeft: `${6 + (item.level - 1) * 10}px` }"
                  :draggable="isDraggable(item.value)"
                  @click.stop="handleSelect"
                  @dragstart="onDragStart($event, item.value)"
                  @dragover="onDragOver($event, item.value)"
                  @drop="onDrop($event, item.value)"
                  @dragend="onDragEnd"
                >
                  <button
                    type="button"
                    class="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                    :disabled="!item.hasChildren"
                    @click.stop="item.hasChildren ? handleToggle() : undefined"
                  >
                    <ChevronDown v-if="item.hasChildren && isExpanded" class="size-3.5" />
                    <ChevronRight v-else-if="item.hasChildren" class="size-3.5" />
                    <span v-else class="size-3.5" />
                  </button>
                  <span
                    class="min-w-[60px] max-w-[100px] flex-1 truncate whitespace-nowrap"
                    :title="buildLabel(item.value)"
                  >
                    {{ buildLabel(item.value) }}
                  </span>
                  <div class="ml-auto flex shrink-0 items-center gap-1.5">
                    <span class="text-[10px] font-mono uppercase text-muted-foreground">{{ item.value.type }}</span>
                    <div class="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <Tooltip v-if="canAddChild(item.value)">
                        <TooltipTrigger as-child>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            class="size-6"
                            aria-label="Add child"
                            @click.stop="onAddChild(item.value)"
                          >
                            <Plus class="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {{ item.value.type === "array" ? "Add item" : "Add child" }}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip v-if="item.value.kind !== 'root' && item.value.kind !== 'item'">
                        <TooltipTrigger as-child>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            class="size-6"
                            :disabled="!isEditable(item.value)"
                            aria-label="Delete node"
                            @click.stop="onDelete(item.value)"
                          >
                            <Trash2 class="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Delete node</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </template>
            </TreeItem>
          </template>
        </TreeVirtualizer>
      </TreeRoot>
    </div>
  </TooltipProvider>
</template>
