<template>
  <div class="space-y-6">
    <section class="rounded-lg border border-border bg-card/60 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs text-muted-foreground">Studio workspace</p>
          <h2 class="mt-2 text-lg font-semibold text-foreground">Resource runtime</h2>
          <p class="mt-1 text-xs text-muted-foreground">
            Open any resource to start building, debugging, and shipping runtime behavior.
          </p>
        </div>
        <button
          type="button"
          class="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          @click="refresh"
        >
          Sync resources
        </button>
      </div>
    </section>

    <section class="rounded-lg border border-border bg-card/60 p-6">
      <div v-if="state.status === 'loading'" class="grid gap-3">
        <div v-for="index in 5" :key="index" class="h-16 animate-pulse rounded-md bg-muted" />
      </div>
      <div v-else-if="state.error" class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        {{ state.error.message }}
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="resource in filteredResources"
          :key="resource.resource_uuid"
          class="flex flex-col gap-3 rounded-md border border-border bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-sm font-medium text-foreground">{{ resource.resource_name }}</p>
            <p class="text-xs text-muted-foreground">{{ resourceTypeLabel(resource.resource_type) }}</p>
          </div>
          <div class="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Added {{ formatDate(resource.created_at) }}</span>
            <RouterLink
              :to="
                resourceRuntimePath({
                  projectId,
                  resourceId: resource.resource_uuid,
                  resourceType: resource.resource_type,
                })
              "
              class="text-xs font-medium text-primary"
            >
              Open runtime
            </RouterLink>
          </div>
        </div>

        <div v-if="filteredResources.length === 0" class="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No references available yet. Add workspace resources from the platform library.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { useResourceLibrary } from "@/engines/resource-library";
import { resourceRuntimePath } from "@/lib/resource-runtime";

const route = useRoute();
const session = useSessionStore();

const projectId = computed(() => String(route.params.projectId || ""));
const workspaceId = computed(() => session.workspaceId);

const { state, refresh, filteredResources: getFilteredResources } = useResourceLibrary({
  workspaceId,
  projectId,
});

const resourceTypes = computed(() => state.value.resourceTypes);
const filteredResources = computed(() => getFilteredResources());

const resourceTypeLabel = (typeName: string) =>
  resourceTypes.value.find((type) => type.name === typeName)?.label ?? typeName;

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString();
};
</script>
