<template>
  <section class="rounded-lg border border-border bg-card p-6">
    <div v-if="status === 'loading'" class="space-y-3">
      <div class="h-5 w-1/3 animate-pulse rounded bg-muted" />
      <div class="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div class="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
    <div v-else-if="status === 'error'" class="space-y-3">
      <p class="text-sm text-destructive">{{ errorMessage }}</p>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="loadResource">Retry</Button>
        <RouterLink
          :to="`/app/projects/${projectId}/resources`"
          class="text-xs font-medium text-primary"
        >
          Back to library
        </RouterLink>
      </div>
    </div>
    <div v-else class="space-y-2">
      <p class="text-xs text-muted-foreground">Redirecting to runtime...</p>
      <p class="text-sm text-foreground">{{ resource?.name }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { getResourceDetails } from "@/engines/resource-library/adapters/resource-library-api";
import { resourceRuntimePath } from "@/lib/resource-runtime";
import type { components } from "@/api/schema";

type ResourceDetailRead = components["schemas"]["ResourceDetailRead"];

const route = useRoute();
const router = useRouter();

const projectId = computed(() => String(route.params.projectId || ""));
const resourceId = computed(() => String(route.params.resourceId || ""));

const resource = ref<ResourceDetailRead | null>(null);
const status = ref<"loading" | "ready" | "error">("loading");
const errorMessage = ref("Failed to load resource details.");

const redirectToRuntime = (resourceType?: string | null) => {
  if (!projectId.value || !resourceId.value) return;
  const path = resourceRuntimePath({
    projectId: projectId.value,
    resourceId: resourceId.value,
    resourceType,
  });
  router.replace(path);
};

const loadResource = async () => {
  if (!resourceId.value) return;
  status.value = "loading";
  const result = await getResourceDetails(resourceId.value);
  if (result.error) {
    status.value = "error";
    resource.value = null;
    errorMessage.value = "Failed to load resource details.";
    return;
  }
  resource.value = result.data?.data ?? null;
  status.value = "ready";
  redirectToRuntime(resource.value?.resource_type);
};

watch([projectId, resourceId], () => {
  loadResource();
});

onMounted(() => {
  loadResource();
});
</script>
