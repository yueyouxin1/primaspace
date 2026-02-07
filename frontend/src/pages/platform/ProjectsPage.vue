<template>
  <div class="space-y-6">
    <section class="rounded-2xl border border-border bg-card p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold text-muted-foreground">Workspace projects</p>
          <h2 class="mt-2 text-2xl font-semibold text-foreground">Project governance</h2>
          <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
            Projects define a runtime entry and governance layer. Resources stay in the workspace and are referenced here
            for delivery, visibility, and dependency insight.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="loadProjects">Refresh</Button>
          <Button size="sm" @click="createProjectDialog?.open()">New project</Button>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span class="rounded-full border border-border bg-background px-3 py-1">
          Total <strong class="text-foreground">{{ projects.length }}</strong>
        </span>
        <span class="rounded-full border border-border bg-background px-3 py-1">
          Draft <strong class="text-foreground">{{ draftCount }}</strong>
        </span>
        <span class="rounded-full border border-border bg-background px-3 py-1">
          Published <strong class="text-foreground">{{ publishedCount }}</strong>
        </span>
      </div>
    </section>

    <section class="rounded-2xl border border-border bg-card p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
        <Tabs v-model="statusFilter" class="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>
        </Tabs>
        <div class="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <ButtonGroup>
            <Button
              size="sm"
              :variant="viewMode === 'grid' ? 'default' : 'outline'"
              @click="viewMode = 'grid'"
            >
              Grid
            </Button>
            <Button
              size="sm"
              :variant="viewMode === 'list' ? 'default' : 'outline'"
              @click="viewMode = 'list'"
            >
              List
            </Button>
            <Button
              size="sm"
              :variant="viewMode === 'compact' ? 'default' : 'outline'"
              @click="viewMode = 'compact'"
            >
              Compact
            </Button>
          </ButtonGroup>
          <Select v-model="sortMode">
            <SelectTrigger class="h-8 w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="updated_desc">Recently updated</SelectItem>
              <SelectItem value="created_desc">Newest created</SelectItem>
              <SelectItem value="name_asc">Name (A–Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z–A)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <div class="flex w-full max-w-sm items-center gap-2 md:w-auto">
            <Input v-model="searchQuery" placeholder="Search projects..." />
            <Badge variant="outline">{{ sortedProjects.length }} results</Badge>
          </div>
        </div>
      </div>
      <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="index in 6" :key="index" class="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div v-else-if="error" class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        {{ error }}
      </div>
      <div
        v-else
        :class="[
          'grid gap-4',
          viewMode === 'list' ? 'grid-cols-1' : '',
          viewMode === 'compact' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3',
        ]"
      >
        <div
          v-if="viewMode === 'list' && sortedProjects.length > 0"
          class="hidden rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground md:grid md:grid-cols-[minmax(0,2fr)_180px_160px_140px_120px_auto] md:gap-4"
        >
          <span>Project</span>
          <span>References</span>
          <span>Status</span>
          <span>Updated</span>
          <span>Visibility</span>
          <span></span>
        </div>
        <div
          v-for="(project, index) in sortedProjects"
          :key="project.uuid"
          :class="[
            'group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-lg',
            viewMode === 'list' ? 'md:flex md:items-stretch' : '',
            viewMode === 'compact' ? 'rounded-xl' : '',
          ]"
        >
          <div
            v-if="viewMode === 'list'"
            class="p-4 md:grid md:grid-cols-[minmax(0,2fr)_180px_160px_140px_120px_auto] md:items-center md:gap-4"
          >
            <div class="min-w-0">
              <RouterLink class="text-sm font-semibold text-foreground transition hover:text-primary" :to="`/app/projects/${project.uuid}`">
                {{ project.name }}
              </RouterLink>
              <p class="mt-1 text-xs text-muted-foreground line-clamp-1">
                {{ project.description || "No description" }}
              </p>
              <p class="mt-1 text-[11px] text-muted-foreground">
                Created {{ formatDate(project.created_at) }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex items-center">
                <div
                  v-for="resource in getResourcePreview(project)"
                  :key="resource.key"
                  class="-ml-2 first:ml-0 flex h-6 w-6 items-center justify-center rounded-full border border-border text-[9px] font-semibold"
                  :class="resource.className"
                  :title="resource.name"
                >
                  {{ resource.label }}
                </div>
                <span
                  v-if="getResourceOverflow(project) > 0"
                  class="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[9px] text-muted-foreground"
                >
                  +{{ getResourceOverflow(project) }}
                </span>
              </div>
              <span class="text-[11px] text-muted-foreground">
                {{ resourceSummary(project) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <Badge variant="outline">{{ project.status }}</Badge>
            </div>

            <div class="text-xs text-muted-foreground">
              {{ formatDate(project.updated_at) }}
            </div>

            <div class="text-xs text-muted-foreground">
              {{ project.visibility }}
            </div>

            <div class="flex justify-end">
              <Button variant="ghost" size="sm">Open</Button>
            </div>
          </div>

          <div v-else :class="['p-4', viewMode === 'compact' ? 'p-3' : '']">
            <div
              :class="[
                'relative rounded-xl border border-border bg-card/60 p-3',
                viewMode === 'compact' ? 'p-2' : '',
              ]"
            >
              <div
                :class="[
                  'absolute -top-2 left-4 h-3 w-16 rounded-t-lg border border-border border-b-0 bg-card',
                  viewMode === 'compact' ? 'left-3 h-2 w-12' : '',
                ]"
              />
          <div :class="['grid grid-cols-4 gap-2', viewMode === 'compact' ? 'gap-1' : '']">
            <div
              v-if="getReferenceState(project) !== 'ready'"
              class="col-span-4 flex items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground"
              :class="viewMode === 'compact' ? 'h-8' : 'h-10'"
            >
              {{
                getReferenceState(project) === "empty"
                  ? "No references"
                  : getReferenceState(project) === "error"
                    ? "References unavailable"
                    : "Syncing references"
              }}
            </div>
            <div
              v-for="resource in getResourcePreview(project)"
              :key="resource.key"
              class="flex items-center justify-center rounded-lg border border-border font-semibold"
              :class="[
                resource.className,
                viewMode === 'compact' ? 'h-8 text-[10px]' : 'h-10 text-[11px]',
              ]"
            >
              {{ resource.label }}
            </div>
          </div>
              <div :class="['mt-3 flex items-center gap-2', viewMode === 'compact' ? 'mt-2' : '']">
                <div class="flex items-center">
                  <div
                  v-for="resource in getResourcePreview(project)"
                    :key="resource.key"
                    class="-ml-2 first:ml-0 flex items-center justify-center rounded-full border border-border font-semibold"
                    :class="[
                      resource.className,
                      viewMode === 'compact' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]',
                    ]"
                    :title="resource.name"
                  >
                    {{ resource.label }}
                  </div>
                  <span
                    v-if="getResourceOverflow(project) > 0"
                    class="-ml-2 flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                    :class="viewMode === 'compact' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]'"
                  >
                    +{{ getResourceOverflow(project) }}
                  </span>
                </div>
                <div v-if="viewMode !== 'compact'" class="min-w-0 text-[11px] text-muted-foreground">
                  {{ resourceSummary(project) }}
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-start justify-between gap-3">
              <div class="min-w-0">
                <RouterLink
                  class="text-sm font-semibold text-foreground transition hover:text-primary"
                  :to="`/app/projects/${project.uuid}`"
                >
                  {{ project.name }}
                </RouterLink>
                <p :class="['mt-1 text-xs text-muted-foreground', viewMode === 'compact' ? 'line-clamp-1' : 'line-clamp-2']">
                  {{ project.description || "No description" }}
                </p>
              </div>
              <Badge variant="outline">{{ project.status }}</Badge>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Updated {{ formatDate(project.updated_at) }}</span>
              <span>Visibility: {{ project.visibility }}</span>
            </div>

            <div class="mt-3 flex items-center justify-between">
              <span class="text-[11px] text-muted-foreground">{{ resourceSummary(project) }}</span>
              <Button variant="ghost" size="sm">Open</Button>
            </div>
          </div>
        </div>

        <div v-if="projects.length === 0" class="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p class="text-sm font-medium text-foreground">No projects yet</p>
          <p class="mt-2 text-xs text-muted-foreground">Set an entry resource and add references to start governance.</p>
          <Button size="sm" class="mt-4" @click="createProjectDialog?.open()">Create project</Button>
        </div>
        <div
          v-else-if="sortedProjects.length === 0"
          class="rounded-2xl border border-dashed border-border px-4 py-10 text-center"
        >
          <p class="text-sm font-medium text-foreground">No matching projects</p>
          <p class="mt-2 text-xs text-muted-foreground">Try adjusting the status filter or search query.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { api } from "@/api";
import type { components } from "@/api/schema";
import { useSessionStore } from "@/stores/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createProjectDialogKey, type CreateProjectDialogContext } from "@/lib/create-project-dialog";

type ProjectRead = components["schemas"]["ProjectRead"];
type ProjectResourceReferenceRead = components["schemas"]["ProjectResourceReferenceRead"];

type ResourcePreview = {
  key: string;
  label: string;
  name: string;
  className: string;
};

const session = useSessionStore();
const createProjectDialog = inject<CreateProjectDialogContext | null>(createProjectDialogKey, null);
const projects = ref<ProjectRead[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref("");
const statusFilter = ref("all");
const viewMode = ref<"grid" | "list" | "compact">("grid");
const sortMode = ref<"updated_desc" | "created_desc" | "name_asc" | "name_desc" | "status">("updated_desc");
const resourcePreviewMap = ref<Record<string, ProjectResourceReferenceRead[]>>({});
const resourceFetchState = ref<Record<string, "loading" | "done" | "error">>({});

const currentWorkspaceId = computed(() => session.workspaceId ?? "");

const draftCount = computed(() =>
  projects.value.filter((project) => String(project.status || "").toLowerCase().includes("draft")).length,
);
const publishedCount = computed(() =>
  projects.value.filter((project) => String(project.status || "").toLowerCase().includes("publish")).length,
);

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return projects.value.filter((project) => {
    const matchesQuery =
      !query ||
      project.name.toLowerCase().includes(query) ||
      (project.description || "").toLowerCase().includes(query);

    const status = String(project.status || "").toLowerCase();
    const matchesStatus =
      statusFilter.value === "all" ||
      (statusFilter.value === "draft" && status.includes("draft")) ||
      (statusFilter.value === "published" && status.includes("publish"));

    return matchesQuery && matchesStatus;
  });
});

const sortedProjects = computed(() => {
  const entries = [...filteredProjects.value];
  const compareText = (a?: string, b?: string) => (a || "").localeCompare(b || "");
  const compareDate = (a?: string, b?: string) => {
    const left = a ? new Date(a).getTime() : 0;
    const right = b ? new Date(b).getTime() : 0;
    return left - right;
  };

  switch (sortMode.value) {
    case "created_desc":
      return entries.sort((a, b) => compareDate(b.created_at, a.created_at));
    case "name_asc":
      return entries.sort((a, b) => compareText(a.name, b.name));
    case "name_desc":
      return entries.sort((a, b) => compareText(b.name, a.name));
    case "status":
      return entries.sort((a, b) => compareText(String(a.status), String(b.status)));
    case "updated_desc":
    default:
      return entries.sort((a, b) => compareDate(b.updated_at, a.updated_at));
  }
});

function resourceTokenMeta(resource: ProjectResourceReferenceRead) {
  const type = String(resource.resource_type || "").toLowerCase();
  if (type.includes("ui")) {
    return { label: "UI", className: "bg-indigo-500/10 text-indigo-600" };
  }
  if (type.includes("workflow")) {
    return { label: "WF", className: "bg-sky-500/10 text-sky-600" };
  }
  if (type.includes("agent")) {
    return { label: "AG", className: "bg-violet-500/10 text-violet-600" };
  }
  if (type.includes("kb") || type.includes("knowledge")) {
    return { label: "KB", className: "bg-amber-500/10 text-amber-600" };
  }
  if (type.includes("db") || type.includes("table")) {
    return { label: "DB", className: "bg-emerald-500/10 text-emerald-600" };
  }
  return { label: "RS", className: "bg-slate-500/10 text-slate-600" };
}

function getResourcePreview(project: ProjectRead): ResourcePreview[] {
  const resources = resourcePreviewMap.value[project.uuid];
  if (!resources || resources.length === 0) {
    return [];
  }
  return resources.slice(0, 4).map((resource, idx) => {
    const meta = resourceTokenMeta(resource);
    return {
      key: `${project.uuid}-${resource.resource_uuid}-${idx}`,
      label: meta.label,
      name: resource.resource_name || resource.resource_type || "Resource",
      className: meta.className,
    };
  });
}

function getReferenceState(project: ProjectRead) {
  const state = resourceFetchState.value[project.uuid];
  if (state === "loading") return "loading";
  if (state === "error") return "error";
  const resources = resourcePreviewMap.value[project.uuid];
  if (!resources) return "idle";
  if (resources.length === 0) return "empty";
  return "ready";
}

function getResourceOverflow(project: ProjectRead) {
  const resources = resourcePreviewMap.value[project.uuid];
  if (!resources || resources.length === 0) {
    return 0;
  }
  return Math.max(resources.length - 4, 0);
}

function resourceSummary(project: ProjectRead) {
  const resources = resourcePreviewMap.value[project.uuid];
  const state = resourceFetchState.value[project.uuid];
  if (state === "error") {
    return "References unavailable";
  }
  if (!resources && state !== "done") {
    return "Syncing references";
  }
  if (!resources || resources.length === 0) {
    return "No references";
  }
  return `${Math.min(resources.length, 4)} shown · ${resources.length} references`;
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString();
}

async function loadProjects() {
  if (!currentWorkspaceId.value) {
    projects.value = [];
    return;
  }

  loading.value = true;
  error.value = null;

  const result = await api.GET("/api/v1/workspaces/{workspace_uuid}/projects", {
    params: { path: { workspace_uuid: currentWorkspaceId.value } },
  });

  if (result.error) {
    error.value = "Failed to load projects for this workspace.";
  } else {
    projects.value = result.data?.data ?? [];
    await preloadResourcePreviews(projects.value);
  }

  loading.value = false;
}

async function preloadResourcePreviews(items: ProjectRead[]) {
  const sample = items.slice(0, 12);
  await Promise.all(sample.map((project) => loadResourcePreview(project)));
}

async function loadResourcePreview(project: ProjectRead) {
  if (resourcePreviewMap.value[project.uuid] || resourceFetchState.value[project.uuid] === "loading") {
    return;
  }
  resourceFetchState.value[project.uuid] = "loading";
  const result = await api.GET("/api/v1/projects/{project_uuid}/resources", {
    params: { path: { project_uuid: project.uuid } },
  });
  if (result.error) {
    resourceFetchState.value[project.uuid] = "error";
    return;
  }
  resourcePreviewMap.value[project.uuid] = result.data?.data ?? [];
  resourceFetchState.value[project.uuid] = "done";
}

watch(
  () => session.workspaceId,
  () => {
    loadProjects();
  },
  { immediate: true },
);

watch(
  () => createProjectDialog?.creationTick.value,
  () => {
    loadProjects();
  },
);

watch(
  () => sortedProjects.value.map((project) => project.uuid),
  (uuids) => {
    const target = sortedProjects.value.filter((project) => uuids.includes(project.uuid)).slice(0, 12);
    preloadResourcePreviews(target);
  },
);
</script>
