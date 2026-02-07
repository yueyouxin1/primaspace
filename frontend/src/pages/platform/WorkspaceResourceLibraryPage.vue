<template>
  <div class="space-y-6">
    <section class="rounded-lg border border-border bg-card p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs text-muted-foreground">Workspace resources</p>
          <h2 class="mt-2 text-xl font-semibold text-foreground">Resource library</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Resources belong to the workspace and can be referenced by projects for governance and delivery.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
            @click="refresh"
          >
            Refresh
          </button>
          <button
            type="button"
            class="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            :disabled="!workspaceId"
            @click="isCreateOpen = true"
          >
            Create resource
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-border bg-card p-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-1 flex-wrap gap-3">
          <div class="min-w-[220px] flex-1">
            <label class="text-xs font-medium text-muted-foreground">Search</label>
            <input
              v-model="query"
              placeholder="Search resources"
              class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div class="min-w-[200px]">
            <label class="text-xs font-medium text-muted-foreground">Type</label>
            <select
              v-model="typeFilter"
              class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              <option v-for="type in resourceTypes" :key="type.name" :value="type.name">
                {{ type.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="text-xs text-muted-foreground">
          <p v-if="status === 'loading'">Syncing resources...</p>
          <p v-else-if="lastSyncedAt">Last synced {{ formatDate(lastSyncedAt) }}</p>
        </div>
      </div>

      <div v-if="status === 'loading'" class="mt-4 grid gap-3">
        <div v-for="index in 5" :key="index" class="h-16 animate-pulse rounded-md bg-muted" />
      </div>
      <div v-else-if="error" class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        {{ error }}
      </div>
      <div v-else class="mt-4 space-y-3">
        <div
          v-for="resource in filteredResources"
          :key="resource.uuid"
          class="flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-sm font-medium text-foreground">{{ resource.name }}</p>
            <p class="text-xs text-muted-foreground">{{ resourceTypeLabel(resource.resource_type) }}</p>
          </div>
          <div class="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:items-end">
            <span>Updated {{ formatDate(resource.updated_at) }}</span>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-xs font-medium text-destructive"
                @click="confirmDelete(resource.uuid)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredResources.length === 0" class="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No resources found in this workspace yet.
        </div>
      </div>
    </section>

    <Dialog v-model:open="isCreateOpen">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create resource</DialogTitle>
          <DialogDescription>Resources live in the workspace and can be referenced by projects.</DialogDescription>
        </DialogHeader>
        <form class="mt-4 space-y-4" @submit.prevent="submitCreate">
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Name</label>
            <Input v-model="createForm.name" placeholder="Marketing UiApp" required />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Type</label>
            <select
              v-model="createForm.resourceType"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            >
              <option disabled value="">Select a resource type</option>
              <option v-for="type in resourceTypes" :key="type.name" :value="type.name">
                {{ type.label }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea v-model="createForm.description" rows="4" placeholder="Optional description" />
          </div>
          <p v-if="createError" class="text-xs text-destructive">{{ createError }}</p>
          <DialogFooter>
            <Button type="submit" :disabled="creating">
              {{ creating ? "Creating..." : "Create resource" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useSessionStore } from "@/stores/session";
import { api } from "@/api";
import type { components } from "@/api/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ResourceRead = components["schemas"]["ResourceRead"];
type ResourceTypeRead = components["schemas"]["ResourceTypeRead"];

const session = useSessionStore();
const workspaceId = computed(() => session.workspaceId ?? null);

const resources = ref<ResourceRead[]>([]);
const resourceTypes = ref<ResourceTypeRead[]>([]);
const status = ref<"idle" | "loading" | "ready" | "error">("idle");
const error = ref<string | null>(null);
const lastSyncedAt = ref<string | null>(null);
const query = ref("");
const typeFilter = ref("");

const filteredResources = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return resources.value.filter((resource) => {
    if (typeFilter.value && resource.resource_type !== typeFilter.value) return false;
    if (!needle) return true;
    return resource.name.toLowerCase().includes(needle);
  });
});

const resourceTypeLabel = (typeName: string) =>
  resourceTypes.value.find((type) => type.name === typeName)?.label ?? typeName;

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString();
};

const refresh = async () => {
  if (!workspaceId.value) {
    resources.value = [];
    return;
  }
  status.value = "loading";
  error.value = null;

  const [typesResult, resourcesResult] = await Promise.all([
    api.GET("/api/v1/resource-types"),
    api.GET("/api/v1/workspaces/{workspace_uuid}/resources", {
      params: { path: { workspace_uuid: workspaceId.value } },
    }),
  ]);

  if (typesResult.error || resourcesResult.error) {
    status.value = "error";
    error.value = "Failed to load workspace resources.";
    resources.value = [];
    return;
  }

  resourceTypes.value = typesResult.data?.data ?? [];
  resources.value = resourcesResult.data?.data ?? [];
  status.value = "ready";
  lastSyncedAt.value = new Date().toISOString();
};

const isCreateOpen = ref(false);
const creating = ref(false);
const createError = ref<string | null>(null);
const createForm = reactive({
  name: "",
  resourceType: "",
  description: "",
});

const submitCreate = async () => {
  if (!workspaceId.value) {
    createError.value = "Select a workspace first.";
    return;
  }
  if (!createForm.name || !createForm.resourceType) {
    createError.value = "Provide a name and resource type.";
    return;
  }
  creating.value = true;
  createError.value = null;

  const result = await api.POST("/api/v1/workspaces/{workspace_uuid}/resources", {
    params: { path: { workspace_uuid: workspaceId.value } },
    body: {
      name: createForm.name,
      resource_type: createForm.resourceType,
      description: createForm.description || null,
    },
  });

  if (result.error) {
    createError.value = "Failed to create resource.";
  } else {
    createForm.name = "";
    createForm.resourceType = "";
    createForm.description = "";
    isCreateOpen.value = false;
    await refresh();
  }

  creating.value = false;
};

const confirmDelete = async (resourceUuid: string) => {
  const accepted = window.confirm("Delete this resource? This cannot be undone.");
  if (!accepted) return;
  const result = await api.DELETE("/api/v1/resources/{resource_uuid}", {
    params: { path: { resource_uuid: resourceUuid } },
  });
  if (!result.error) {
    resources.value = resources.value.filter((resource) => resource.uuid !== resourceUuid);
  }
};

watch(workspaceId, () => {
  refresh();
}, { immediate: true });
</script>
