<template>
  <div class="space-y-6">
    <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="rounded-lg border border-border bg-card p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-foreground">Team members</h2>
            <p class="text-xs text-muted-foreground">Manage roles and permissions</p>
          </div>
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
            @click="refreshTeam"
          >
            Refresh
          </button>
        </div>

        <div v-if="membersLoading" class="mt-4 grid gap-3">
          <div v-for="index in 4" :key="index" class="h-14 animate-pulse rounded-md bg-muted" />
        </div>
        <div v-else-if="membersError" class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {{ membersError }}
        </div>
        <div v-else class="mt-4 space-y-3">
          <div
            v-for="member in members"
            :key="member.uuid"
            class="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-foreground">{{ member.user.nick_name || member.user.email || member.user.uuid }}</p>
              <p class="text-xs text-muted-foreground">{{ member.user.email || member.user.phone_number || "--" }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground">{{ member.role.label || member.role.name }}</p>
              <p class="text-xs text-muted-foreground">{{ member.role.role_type }}</p>
            </div>
          </div>

          <div v-if="members.length === 0" class="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No members in this team yet.
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-lg border border-border bg-card p-6">
          <h3 class="text-base font-semibold text-foreground">Create team</h3>
          <p class="mt-1 text-xs text-muted-foreground">Teams are billing and permission boundaries.</p>

          <form class="mt-4 space-y-3" @submit.prevent="createTeam">
            <div>
              <label class="text-xs font-medium text-muted-foreground">Team name</label>
              <input
                v-model="newTeamName"
                type="text"
                class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Growth squad"
                required
              />
            </div>
            <button type="submit" class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" :disabled="creatingTeam">
              {{ creatingTeam ? "Creating..." : "Create team" }}
            </button>
          </form>
          <p v-if="teamError" class="mt-3 text-xs text-destructive">{{ teamError }}</p>
        </div>

        <div class="rounded-lg border border-border bg-card p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-semibold text-foreground">Roles</h3>
              <p class="text-xs text-muted-foreground">Roles are derived from permissions tree</p>
            </div>
            <button
              type="button"
              class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
              @click="loadRoles"
            >
              Refresh
            </button>
          </div>

          <div v-if="rolesLoading" class="mt-4 grid gap-3">
            <div v-for="index in 3" :key="index" class="h-12 animate-pulse rounded-md bg-muted" />
          </div>
          <div v-else-if="rolesError" class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {{ rolesError }}
          </div>
          <div v-else class="mt-4 space-y-3">
            <div
              v-for="role in roles"
              :key="role.uuid"
              class="rounded-md border border-border bg-background px-4 py-3"
            >
              <p class="text-sm font-medium text-foreground">{{ role.label || role.name }}</p>
              <p class="text-xs text-muted-foreground">{{ role.description || role.role_type }}</p>
            </div>
            <div v-if="roles.length === 0" class="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No roles found for this team.
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import { api } from "@/api";
import type { components } from "@/api/schema";
import { useSessionStore } from "@/stores/session";
import { platformContextKey, type PlatformContext } from "@/lib/platform-context";

type TeamMemberRead = components["schemas"]["TeamMemberRead"];
type RoleRead = components["schemas"]["RoleRead"];

const session = useSessionStore();
const platformContext = inject<PlatformContext>(platformContextKey, null);

const members = ref<TeamMemberRead[]>([]);
const roles = ref<RoleRead[]>([]);
const membersLoading = ref(false);
const rolesLoading = ref(false);
const membersError = ref<string | null>(null);
const rolesError = ref<string | null>(null);

const newTeamName = ref("");
const creatingTeam = ref(false);
const teamError = ref<string | null>(null);

const currentTeamId = computed(() => session.teamId ?? platformContext?.teams.value[0]?.uuid ?? "");
async function loadMembers() {
  if (!currentTeamId.value) return;
  membersLoading.value = true;
  membersError.value = null;

  const result = await api.GET("/api/v1/teams/{team_uuid}/members", {
    params: { path: { team_uuid: currentTeamId.value } },
  });

  if (result.error) {
    membersError.value = "Failed to load team members.";
    members.value = [];
  } else {
    members.value = result.data?.data ?? [];
  }

  membersLoading.value = false;
}

async function loadRoles() {
  if (!currentTeamId.value) return;
  rolesLoading.value = true;
  rolesError.value = null;

  const result = await api.GET("/api/v1/teams/{team_uuid}/roles", {
    params: { path: { team_uuid: currentTeamId.value } },
  });

  if (result.error) {
    rolesError.value = "Failed to load roles.";
    roles.value = [];
  } else {
    roles.value = result.data?.data ?? [];
  }

  rolesLoading.value = false;
}

async function createTeam() {
  if (!newTeamName.value) return;
  creatingTeam.value = true;
  teamError.value = null;

  const result = await api.POST("/api/v1/teams", {
    body: {
      name: newTeamName.value,
    },
  });

  if (result.error) {
    teamError.value = "Unable to create team.";
  } else {
    newTeamName.value = "";
    if (platformContext) {
      const refreshed = await api.GET("/api/v1/teams");
      if (!refreshed.error) {
        platformContext.teams.value = refreshed.data?.data ?? [];
        if (platformContext.teams.value.length > 0 && !session.teamId) {
          session.setContext({ teamId: platformContext.teams.value[0].uuid });
        }
      }
    }
  }

  creatingTeam.value = false;
}

function refreshTeam() {
  loadMembers();
  loadRoles();
}

watch(currentTeamId, (value) => {
  if (value && value !== session.teamId) {
    session.setContext({ teamId: value });
  }
  refreshTeam();
});

onMounted(() => {
  refreshTeam();
});
</script>
