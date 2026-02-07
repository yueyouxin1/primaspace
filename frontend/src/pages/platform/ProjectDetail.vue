<template>
  <div class="space-y-6">
    <section class="rounded-lg border border-border bg-card p-6">
      <div v-if="loading" class="space-y-3">
        <div class="h-6 w-1/3 animate-pulse rounded bg-muted" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div v-else-if="error" class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        {{ error }}
      </div>
      <div v-else-if="project" class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs text-muted-foreground">Project UUID</p>
          <h2 class="mt-2 text-xl font-semibold text-foreground">{{ project.name }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ project.description || "No description" }}</p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span class="rounded-full border border-border px-2 py-0.5">{{ project.status }}</span>
            <span class="rounded-full border border-border px-2 py-0.5">{{ project.visibility }}</span>
            <span class="rounded-full border border-border px-2 py-0.5">Created {{ formatDate(project.created_at) }}</span>
          </div>
        </div>
        <div class="text-right">
          <RouterLink
            :to="`/studio/${project.uuid}`"
            class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Open Studio
          </RouterLink>
          <p class="mt-2 text-xs text-muted-foreground">Runtime entry and debugging for this project</p>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-border bg-card p-6">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-md border border-border bg-background px-4 py-4">
          <p class="text-xs font-semibold text-muted-foreground">Entry resource</p>
          <p class="mt-2 text-sm font-medium text-foreground">
            {{ mainResourceName || "Not set" }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            main_resource is the delivery entry point, not the full dependency graph.
          </p>
        </div>
        <div class="rounded-md border border-border bg-background px-4 py-4">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-muted-foreground">Project env config</p>
            <button
              type="button"
              class="text-xs font-medium text-primary"
              @click="loadEnvConfig"
            >
              Refresh
            </button>
          </div>
          <p v-if="envConfigStatus === 'loading'" class="mt-2 text-xs text-muted-foreground">Loading...</p>
          <p v-else-if="envConfigError" class="mt-2 text-xs text-destructive">{{ envConfigError }}</p>
          <div v-else class="mt-2">
            <p class="text-sm font-medium text-foreground">{{ envConfigKeys.length }} keys</p>
            <p class="mt-1 text-xs text-muted-foreground">
              Config is optional and must not be a runtime hard dependency.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-border bg-card p-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="text-base font-semibold text-foreground">Dependency graph</h3>
          <p class="text-xs text-muted-foreground">
            Aggregates project references plus resource-resolved dependencies.
          </p>
        </div>
        <button
          type="button"
          class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
          @click="loadDependencyGraph"
        >
          Refresh
        </button>
      </div>
      <div class="mt-4">
        <p v-if="dependencyStatus === 'loading'" class="text-xs text-muted-foreground">Loading graph...</p>
        <p v-else-if="dependencyError" class="text-xs text-destructive">{{ dependencyError }}</p>
        <div v-else class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-border bg-background px-3 py-3">
            <p class="text-xs text-muted-foreground">Nodes</p>
            <p class="mt-1 text-sm font-semibold text-foreground">{{ dependencySummary.nodes }}</p>
          </div>
          <div class="rounded-md border border-border bg-background px-3 py-3">
            <p class="text-xs text-muted-foreground">Declared refs</p>
            <p class="mt-1 text-sm font-semibold text-foreground">{{ dependencySummary.declared }}</p>
          </div>
          <div class="rounded-md border border-border bg-background px-3 py-3">
            <p class="text-xs text-muted-foreground">Edges</p>
            <p class="mt-1 text-sm font-semibold text-foreground">{{ dependencySummary.edges }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-border bg-card p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-foreground">Project references</h3>
          <p class="text-xs text-muted-foreground">Explicit resources referenced for governance</p>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink
            :to="`/app/projects/${projectId}/resources`"
            class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
          >
            Open references
          </RouterLink>
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
            @click="loadResources"
          >
            Refresh
          </button>
        </div>
      </div>

      <div v-if="resourceLoading" class="mt-4 grid gap-3">
        <div v-for="index in 4" :key="index" class="h-14 animate-pulse rounded-md bg-muted" />
      </div>
      <div v-else-if="resourceError" class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        {{ resourceError }}
      </div>
      <div v-else class="mt-4 space-y-3">
        <div
          v-for="resource in resources"
          :key="resource.resource_uuid"
          class="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3"
        >
          <div>
            <p class="text-sm font-medium text-foreground">{{ resource.resource_name }}</p>
            <p class="text-xs text-muted-foreground">{{ resource.resource_type }}</p>
            <p v-if="resource.alias" class="text-[11px] text-muted-foreground">Alias: {{ resource.alias }}</p>
          </div>
          <div class="text-right text-xs text-muted-foreground">
            <p>Added {{ formatDate(resource.created_at) }}</p>
            <p>Workspace instance: {{ resource.workspace_instance_uuid || "--" }}</p>
          </div>
        </div>

        <div v-if="resources.length === 0" class="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No references added to this project yet.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { api } from "@/api";
import type { components } from "@/api/schema";

type ProjectRead = components["schemas"]["ProjectRead"];
type ProjectResourceReferenceRead = components["schemas"]["ProjectResourceReferenceRead"];
type ProjectEnvConfigRead = components["schemas"]["ProjectEnvConfigRead"];
type ProjectDependencyGraphRead = components["schemas"]["ProjectDependencyGraphRead"];

const route = useRoute();
const projectId = computed(() => String(route.params.projectId || ""));

const project = ref<ProjectRead | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const resources = ref<ProjectResourceReferenceRead[]>([]);
const resourceLoading = ref(false);
const resourceError = ref<string | null>(null);
const envConfig = ref<ProjectEnvConfigRead | null>(null);
const envConfigStatus = ref<"idle" | "loading" | "ready" | "error">("idle");
const envConfigError = ref<string | null>(null);
const dependencyGraph = ref<ProjectDependencyGraphRead | null>(null);
const dependencyStatus = ref<"idle" | "loading" | "ready" | "error">("idle");
const dependencyError = ref<string | null>(null);

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString();
}

async function loadProject() {
  if (!projectId.value) return;
  loading.value = true;
  error.value = null;

  const result = await api.GET("/api/v1/projects/{project_uuid}", {
    params: { path: { project_uuid: projectId.value } },
  });

  if (result.error) {
    error.value = "Failed to load project details.";
    project.value = null;
  } else {
    project.value = result.data?.data ?? null;
  }

  loading.value = false;
}

const getMainResourceId = () => {
  const record = project.value as
    | (ProjectRead & {
        main_resource_id?: string | null;
        main_resource_uuid?: string | null;
        main_resource?: string | null;
      })
    | null;
  return record?.main_resource_id ?? record?.main_resource_uuid ?? record?.main_resource ?? null;
};

const mainResourceName = computed(() => {
  const mainId = getMainResourceId();
  if (!mainId) return "";
  const match = resources.value.find((resource) => resource.resource_uuid === mainId);
  return match?.resource_name || mainId;
});

const envConfigKeys = computed(() => Object.keys(envConfig.value?.env_config ?? {}));

const dependencySummary = computed(() => {
  const graph = dependencyGraph.value;
  if (!graph) {
    return { nodes: "--", edges: "--", declared: "--" };
  }
  const declared = graph.nodes.filter((node) => node.declared).length;
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    declared,
  };
});

async function loadResources() {
  if (!projectId.value) return;
  resourceLoading.value = true;
  resourceError.value = null;

  const result = await api.GET("/api/v1/projects/{project_uuid}/resources", {
    params: { path: { project_uuid: projectId.value } },
  });

  if (result.error) {
    resourceError.value = "Failed to load project references.";
    resources.value = [];
  } else {
    resources.value = result.data?.data ?? [];
  }

  resourceLoading.value = false;
}

async function loadEnvConfig() {
  if (!projectId.value) return;
  envConfigStatus.value = "loading";
  envConfigError.value = null;
  const result = await api.GET("/api/v1/projects/{project_uuid}/env-config", {
    params: { path: { project_uuid: projectId.value } },
  });
  if (result.error) {
    const status = (result.error as { status?: number }).status;
    if (status === 404) {
      envConfig.value = { env_config: {} };
      envConfigStatus.value = "ready";
      envConfigError.value = null;
      return;
    }
    envConfig.value = null;
    envConfigStatus.value = "error";
    envConfigError.value = "Failed to load env config.";
    return;
  }
  envConfig.value = result.data?.data ?? null;
  envConfigStatus.value = "ready";
}

async function loadDependencyGraph() {
  if (!projectId.value) return;
  dependencyStatus.value = "loading";
  dependencyError.value = null;
  const result = await api.GET("/api/v1/projects/{project_uuid}/dependency-graph", {
    params: { path: { project_uuid: projectId.value } },
  });
  if (result.error) {
    dependencyGraph.value = null;
    dependencyStatus.value = "error";
    dependencyError.value = "Failed to load dependency graph.";
    return;
  }
  dependencyGraph.value = result.data?.data ?? null;
  dependencyStatus.value = "ready";
}

watch(projectId, () => {
  loadProject();
  loadResources();
  loadEnvConfig();
  loadDependencyGraph();
});

onMounted(() => {
  loadProject();
  loadResources();
  loadEnvConfig();
  loadDependencyGraph();
});
</script>
