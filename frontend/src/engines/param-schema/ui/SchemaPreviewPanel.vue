<script setup lang="ts">
import type { SchemaIssue, SchemaNode } from "../core";
import { resolvePreview } from "../core";
import { computed } from "vue";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { Badge } from "@/components/ui/badge";

const props = defineProps<{
  node: SchemaNode | null;
  issues: SchemaIssue[];
}>();

const preview = computed(() => (props.node ? resolvePreview(props.node) : null));
const nodeIssues = computed(() => {
  if (!props.node) return [];
  return props.issues.filter((issue) => issue.nodeId === props.node?.id);
});

const previewText = computed(() => {
  if (!props.node) return "";
  try {
    return JSON.stringify(preview.value?.value ?? null, null, 2);
  } catch {
    return String(preview.value?.value ?? "");
  }
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col border-l bg-background">
    <div class="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Preview</div>
    <div v-if="!node" class="flex-1 p-4 text-sm text-muted-foreground">No node selected.</div>
    <div v-else class="flex-1 min-h-0 overflow-hidden p-4">
      <div class="flex h-full min-h-0 flex-col gap-4">
        <div class="flex min-h-0 flex-1 flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="text-xs font-medium text-muted-foreground">Resolved Value</div>
            <Badge variant="secondary" class="text-[10px]">
              source: {{ preview?.source ?? "empty" }}
            </Badge>
          </div>
          <div class="flex-1 min-h-0 overflow-hidden">
            <CodeBlock
              :code="previewText"
              language="json"
              class="h-full min-h-0 text-xs [&>div]:h-full [&>div]:min-h-0"
            />
          </div>
        </div>

        <div class="max-h-[35%] space-y-2 overflow-auto">
          <div class="text-xs font-medium text-muted-foreground">Issues</div>
          <div v-if="nodeIssues.length === 0" class="text-xs text-muted-foreground">No issues.</div>
          <div v-else class="space-y-2">
            <div
              v-for="issue in nodeIssues"
              :key="issue.code + issue.path"
              class="rounded-md border px-2 py-1 text-xs"
              :class="issue.level === 'error' ? 'border-red-300 text-red-600' : 'border-amber-300 text-amber-700'"
            >
              <div class="font-medium">{{ issue.code }}</div>
              <div class="text-xs">{{ issue.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
