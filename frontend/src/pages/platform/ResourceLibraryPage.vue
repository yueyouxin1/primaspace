<template>
  <div class="space-y-6">
    <section class="rounded-lg border border-border bg-card p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs text-muted-foreground">Project references</p>
          <h2 class="mt-2 text-xl font-semibold text-foreground">Project resource references</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Project references only govern delivery and visibility. Resources still belong to the workspace.
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
            :disabled="!projectId || !workspaceId"
            @click="openReferenceDialog"
          >
            Add reference
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
          <p v-if="state.status === 'loading'">Syncing resources...</p>
          <p v-else-if="state.lastSyncedAt">Last synced {{ formatDate(state.lastSyncedAt) }}</p>
        </div>
      </div>

      <div v-if="state.status === 'loading'" class="mt-4 grid gap-3">
        <div v-for="index in 5" :key="index" class="h-16 animate-pulse rounded-md bg-muted" />
      </div>
      <div v-else-if="state.error" class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        {{ state.error.message }}
      </div>
      <div v-else class="mt-4 space-y-3">
        <div
          v-for="resource in filteredResources"
          :key="resource.resource_uuid"
          class="flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-sm font-medium text-foreground">{{ resource.resource_name }}</p>
            <p class="text-xs text-muted-foreground">{{ resourceTypeLabel(resource.resource_type) }}</p>
            <p v-if="resource.alias" class="text-[11px] text-muted-foreground">Alias: {{ resource.alias }}</p>
          </div>
          <div class="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:items-end">
            <span>Added {{ formatDate(resource.created_at) }}</span>
            <div class="flex items-center gap-3">
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
                Open details
              </RouterLink>
              <button
                type="button"
                class="text-xs font-medium text-destructive"
                @click="confirmDelete(resource.resource_uuid)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredResources.length === 0" class="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No references found for this project yet.
        </div>
      </div>
    </section>

    <Dialog v-model:open="isCreateOpen">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add project reference</DialogTitle>
          <DialogDescription>Select a workspace resource to reference in this project.</DialogDescription>
        </DialogHeader>
        <form class="mt-4 space-y-4" @submit.prevent="submitCreate">
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Resource</label>
            <select
              v-model="createForm.resourceUuid"
              class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            >
              <option disabled value="">Select a resource</option>
              <option v-for="resource in availableResources" :key="resource.uuid" :value="resource.uuid">
                {{ resource.name }} · {{ resource.resource_type }}
              </option>
            </select>
            <p v-if="availableError" class="text-[11px] text-destructive">{{ availableError }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Alias (optional)</label>
            <Input v-model="createForm.alias" placeholder="entry-ui" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <Textarea v-model="createForm.options" rows="3" placeholder="Usage intent or governance notes" />
          </div>
          <p v-if="createError" class="text-xs text-destructive">{{ createError }}</p>
          <DialogFooter>
            <Button type="submit" :disabled="creating">
              {{ creating ? "Adding..." : "Add reference" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { useResourceLibrary } from "@/engines/resource-library";
import { resourceRuntimePath } from "@/lib/resource-runtime";
import { listWorkspaceResources } from "@/engines/resource-library/adapters/resource-library-api";
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
import type { components } from "@/api/schema";

type ResourceRead = components["schemas"]["ResourceRead"];

const route = useRoute();
const session = useSessionStore();

const projectId = computed(() => String(route.params.projectId || ""));
const workspaceId = computed(() => session.workspaceId ?? null);

const { state, dispatch, refresh, filteredResources: getFilteredResources, addReference, removeReference } =
  useResourceLibrary({
  workspaceId,
  projectId,
});

const query = computed({
  get: () => state.value.query,
  set: (value: string) => dispatch({ type: "set-query", query: value }),
});

const typeFilter = computed({
  get: () => state.value.filters.resourceType ?? "",
  set: (value: string) =>
    dispatch({
      type: "set-filters",
      filters: {
        ...state.value.filters,
        resourceType: value || null,
      },
    }),
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

const isCreateOpen = ref(false);
const creating = ref(false);
const createError = ref<string | null>(null);
const availableResources = ref<ResourceRead[]>([]);
const availableError = ref<string | null>(null);
const createForm = reactive({
  resourceUuid: "",
  alias: "",
  options: "",
});

const loadAvailableResources = async () => {
  if (!workspaceId.value) {
    availableResources.value = [];
    availableError.value = "Select a workspace first.";
    return;
  }
  availableError.value = null;
  const result = await listWorkspaceResources(workspaceId.value);
  if (result.error) {
    availableResources.value = [];
    availableError.value = "Failed to load workspace resources.";
    return;
  }
  availableResources.value = result.data?.data ?? [];
};

const openReferenceDialog = () => {
  isCreateOpen.value = true;
};

const submitCreate = async () => {
  if (!createForm.resourceUuid) {
    createError.value = "Choose a resource to reference.";
    return;
  }
  creating.value = true;
  createError.value = null;

  const result = await addReference({
    resource_uuid: createForm.resourceUuid,
    alias: createForm.alias || null,
    options: createForm.options ? { note: createForm.options } : null,
  });

  if (!result.ok) {
    createError.value = "Failed to add reference.";
  } else {
    createForm.resourceUuid = "";
    createForm.alias = "";
    createForm.options = "";
    isCreateOpen.value = false;
  }

  creating.value = false;
};

const confirmDelete = async (resourceUuid: string) => {
  const accepted = window.confirm("Remove this reference from the project?");
  if (!accepted) return;
  await removeReference(resourceUuid);
};

watch(isCreateOpen, (open) => {
  if (open) {
    loadAvailableResources();
  }
});
</script>
