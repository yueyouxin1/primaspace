<template>
  <div class="flex h-full min-h-[calc(100vh-200px)] flex-col gap-6">
    <section class="rounded-lg border border-border bg-card/60 p-6">
      <div v-if="loading" class="space-y-3">
        <div class="h-5 w-1/3 animate-pulse rounded bg-muted" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div v-else-if="error" class="text-sm text-destructive">
        {{ error }}
      </div>
      <div v-else class="space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs text-muted-foreground">Runtime panel</p>
            <h2 class="text-lg font-semibold text-foreground">{{ resource?.name || "Resource" }}</h2>
            <p class="text-xs text-muted-foreground">
              {{ resource?.description || "Runtime view is being prepared for this resource type." }}
            </p>
          </div>
          <span class="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
            {{ resource?.resource_type || resourceKindLabel }}
          </span>
        </div>
        <div class="rounded-lg border border-dashed border-border bg-background/50 px-4 py-10 text-center text-sm text-muted-foreground">
          The runtime panel for this resource type is coming soon. Use the Agent Playground for live debugging now.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getResourceDetails } from "@/engines/resource-library/adapters/resource-library-api";
import type { components } from "@/api/schema";

type ResourceDetailRead = components["schemas"]["ResourceDetailRead"];

const route = useRoute();
const resourceId = computed(() => String(route.params.resourceId || ""));
const resourceKind = computed(() => String(route.params.resourceKind || "resource"));

const resource = ref<ResourceDetailRead | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const resourceKindLabel = computed(() => resourceKind.value.replace(/s$/, ""));

const loadResource = async () => {
  if (!resourceId.value) return;
  loading.value = true;
  error.value = null;
  const result = await getResourceDetails(resourceId.value);
  if (result.error) {
    error.value = "Unable to load resource details.";
    resource.value = null;
  } else {
    resource.value = result.data?.data ?? null;
  }
  loading.value = false;
};

watch(resourceId, () => {
  loadResource();
});

onMounted(() => {
  loadResource();
});
</script>
