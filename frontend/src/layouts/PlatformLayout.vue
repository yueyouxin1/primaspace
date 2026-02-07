<template>
  <div class="h-screen overflow-hidden bg-muted/30 text-foreground">
    <div class="flex h-full">
      <aside class="scrollbar-slim h-full w-72 overscroll-contain overflow-y-auto border-r border-border bg-card px-4 py-6">
        <div class="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span class="text-sm font-semibold">PS</span>
          </div>
          <div>
            <p class="text-sm font-semibold text-foreground">PrismaSpace</p>
            <p class="text-xs text-muted-foreground">Platform console</p>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <div>
            <label class="text-xs font-medium text-muted-foreground">Workspace</label>
            <Select v-model="currentWorkspaceId">
              <SelectTrigger class="mt-2 w-full bg-background">
                <SelectValue placeholder="Choose workspace" />
              </SelectTrigger>
              <SelectContent align="start" class="w-[var(--reka-select-trigger-width)]">
                <SelectItem v-for="workspace in workspaces" :key="workspace.uuid" :value="workspace.uuid">
                  {{ workspace.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground">Team</label>
            <Select v-model="currentTeamId">
              <SelectTrigger class="mt-2 w-full bg-background">
                <SelectValue placeholder="Choose team" />
              </SelectTrigger>
              <SelectContent align="start" class="w-[var(--reka-select-trigger-width)]">
                <SelectItem v-for="team in teams" :key="team.uuid" :value="team.uuid">
                  {{ team.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="mt-6 rounded-xl border border-border bg-background px-3 py-3">
          <p class="text-xs font-semibold text-muted-foreground">Templates</p>
          <p class="mt-2 text-xs text-muted-foreground">Start from a verified kit and iterate fast.</p>
          <button
            type="button"
            class="mt-3 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            @click="isCreateOpen = true"
          >
            Create project
          </button>
        </div>

        <nav class="mt-6 space-y-1 text-sm">
          <p class="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center justify-between rounded-md px-3 py-2 text-sm transition hover:bg-muted"
            :class="isActive(item) ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'"
          >
            <span>{{ item.label }}</span>
            <span v-if="item.badge" class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {{ item.badge }}
            </span>
          </RouterLink>
        </nav>

        <div class="mt-6 rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-background px-3 py-3">
          <p class="text-xs font-semibold text-muted-foreground">Template market</p>
          <p class="mt-2 text-xs text-muted-foreground">124 official + community starters</p>
          <div class="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>36 trending today</span>
            <span>Updated 24h</span>
          </div>
        </div>

        <div class="mt-6">
          <div class="rounded-lg border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
            <p class="font-medium text-foreground">Billing guardrails</p>
            <p class="mt-2">402/403 will trigger platform modals. Keep workflows within plan quotas.</p>
          </div>
        </div>
      </aside>

      <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <header class="sticky top-0 z-10 border-b border-border bg-gradient-to-r from-background via-background/90 to-muted/40 backdrop-blur">
          <div class="flex items-center justify-between px-6 py-4">
            <div>
              <p class="text-sm text-muted-foreground">{{ currentWorkspace?.name || "No workspace" }}</p>
              <h1 class="text-xl font-semibold text-foreground">{{ pageTitle }}</h1>
            </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              @click="refreshContext"
            >
              Refresh
            </button>
            <button
              type="button"
              class="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
            >
              Browse templates
            </button>
            <div class="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
              <span class="text-xs text-muted-foreground">Theme</span>
              <Select v-model="themeStore.mode">
                <SelectTrigger class="h-8 w-[120px] bg-background text-xs">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent align="end" class="w-[var(--reka-select-trigger-width)]">
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
              <span class="text-xs text-muted-foreground">{{ currentTeam?.name || "Team" }}</span>
              <span class="text-xs font-medium text-foreground">{{ user?.nick_name || user?.email || "Guest" }}</span>
            </div>
          </div>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 flex-col px-6 py-6">
          <div v-if="loadError" class="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {{ loadError }}
          </div>
          <div class="flex h-full min-h-0 flex-col">
            <RouterView class="flex-1 min-h-0" />
          </div>
        </div>
      </main>
    </div>
    <Dialog v-model:open="isCreateOpen">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Define a runtime entry and governance layer. Resources stay in the workspace and are referenced here.
          </DialogDescription>
        </DialogHeader>
        <form class="mt-4 space-y-4" @submit.prevent="createProject">
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Name</label>
            <Input v-model="newProjectName" placeholder="AI onboarding dashboard" required />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea v-model="newProjectDescription" rows="4" placeholder="Template-driven UI + workflow" />
          </div>
          <p v-if="createError" class="text-xs text-destructive">{{ createError }}</p>
          <DialogFooter>
            <Button type="submit" :disabled="creating || !currentWorkspaceId">
              {{ creating ? "Creating..." : "Create project" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { api } from "@/api";
import type { components } from "@/api/schema";
import { useSessionStore } from "@/stores/session";
import { platformContextKey } from "@/lib/platform-context";
import { useAuthStore } from "@/stores/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProjectDialogKey } from "@/lib/create-project-dialog";
import { useThemeStore } from "@/stores/theme";

const session = useSessionStore();
const auth = useAuthStore();
const route = useRoute();
const themeStore = useThemeStore();

type WorkspaceRead = components["schemas"]["WorkspaceRead"];
type TeamRead = components["schemas"]["TeamRead"];

type NavItem = {
  label: string;
  to: string;
  match: string;
  badge?: string;
  exact?: boolean;
};

const projectId = computed(() => String(route.params.projectId || ""));

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { label: "Overview", to: "/app", match: "/app", exact: true },
    { label: "Projects", to: "/app/projects", match: "/app/projects" },
    { label: "Resource library", to: "/app/resources", match: "/app/resources" },
  ];

  if (projectId.value) {
    // Project references are surfaced inside the project page only.
  }

  items.push(
    { label: "Team & roles", to: "/app/team", match: "/app/team" },
    { label: "Billing", to: "/app/billing", match: "/app/billing", badge: "Pro" },
  );

  return items;
});

const isActive = (item: NavItem) => (item.exact ? route.path === item.to : route.path.startsWith(item.match));

const workspaces = ref<WorkspaceRead[]>([]);
const teams = ref<TeamRead[]>([]);
const loadError = ref<string | null>(null);

const currentWorkspaceId = computed({
  get: () => session.workspaceId ?? workspaces.value[0]?.uuid ?? "",
  set: (value: string) => session.setContext({ workspaceId: value || null }),
});

const currentTeamId = computed({
  get: () => session.teamId ?? teams.value[0]?.uuid ?? "",
  set: (value: string) => session.setContext({ teamId: value || null }),
});

const currentWorkspace = computed(
  () => workspaces.value.find((workspace) => workspace.uuid === currentWorkspaceId.value) ?? null,
);
const currentTeam = computed(() => teams.value.find((team) => team.uuid === currentTeamId.value) ?? null);
const user = computed(() => auth.user);
const isCreateOpen = ref(false);
const createError = ref<string | null>(null);
const creating = ref(false);
const newProjectName = ref("");
const newProjectDescription = ref("");
const creationTick = ref(0);

const pageTitle = computed(() => (route.meta.title as string) || "PrismaSpace");

provide(platformContextKey, { workspaces, teams });
provide(createProjectDialogKey, {
  open: () => {
    isCreateOpen.value = true;
  },
  creationTick,
});

async function refreshContext() {
  loadError.value = null;
  try {
    const [userResult, teamsResult, workspacesResult] = await Promise.all([
      auth.fetchMe(),
      api.GET("/api/v1/teams"),
      api.GET("/api/v1/workspaces"),
    ]);

    if (teamsResult.data?.data) {
      teams.value = teamsResult.data.data;
      if (!session.teamId && teams.value.length > 0) {
        session.setContext({ teamId: teams.value[0].uuid });
      }
    }

    if (workspacesResult.data?.data) {
      workspaces.value = workspacesResult.data.data;
      if (!session.workspaceId && workspaces.value.length > 0) {
        session.setContext({ workspaceId: workspaces.value[0].uuid });
      }
    }

    if (!userResult || teamsResult.error || workspacesResult.error) {
      loadError.value = "Some context data failed to load. Please retry.";
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "Failed to load platform context.";
  }
}

async function createProject() {
  if (!currentWorkspaceId.value) {
    createError.value = "Select a workspace first.";
    return;
  }

  createError.value = null;
  creating.value = true;

  const result = await api.POST("/api/v1/workspaces/{workspace_uuid}/projects", {
    params: { path: { workspace_uuid: currentWorkspaceId.value } },
    body: {
      name: newProjectName.value,
      description: newProjectDescription.value || null,
    },
  });

  if (result.error) {
    createError.value = "Unable to create project. Please try again.";
  } else {
    newProjectName.value = "";
    newProjectDescription.value = "";
    isCreateOpen.value = false;
    creationTick.value += 1;
  }

  creating.value = false;
}

onMounted(() => {
  refreshContext();
});
</script>
