<template>
  <div class="space-y-6">
    <section class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-lg border border-border bg-card p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-foreground">Team entitlements</h2>
            <p class="text-xs text-muted-foreground">Billing boundaries are enforced by team UUID</p>
          </div>
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
            @click="loadTeamEntitlements"
          >
            Refresh
          </button>
        </div>

        <div v-if="teamLoading" class="mt-4 grid gap-3">
          <div v-for="index in 3" :key="index" class="h-12 animate-pulse rounded-md bg-muted" />
        </div>
        <div v-else-if="teamError" class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {{ teamError }}
        </div>
        <div v-else class="mt-4 space-y-3">
          <div
            v-for="entitlement in teamEntitlements"
            :key="entitlement.id"
            class="rounded-md border border-border bg-background px-4 py-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-foreground">{{ entitlement.feature.label || entitlement.feature.name }}</p>
                <p class="text-xs text-muted-foreground">{{ entitlement["source_entitlement.product.name"] }}</p>
              </div>
              <span class="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {{ entitlement.status }}
              </span>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <p>Quota: {{ entitlement.granted_quota }}</p>
              <p>Used: {{ entitlement.consumed_usage }}</p>
              <p>Start: {{ formatDate(entitlement.start_date) }}</p>
              <p>End: {{ formatDate(entitlement.end_date) }}</p>
            </div>
          </div>
          <div v-if="teamEntitlements.length === 0" class="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No entitlements found for this team.
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-foreground">My entitlements</h2>
            <p class="text-xs text-muted-foreground">Personal entitlements for the current user</p>
          </div>
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
            @click="loadMyEntitlements"
          >
            Refresh
          </button>
        </div>

        <div v-if="myLoading" class="mt-4 grid gap-3">
          <div v-for="index in 3" :key="index" class="h-12 animate-pulse rounded-md bg-muted" />
        </div>
        <div v-else-if="myError" class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {{ myError }}
        </div>
        <div v-else class="mt-4 space-y-3">
          <div
            v-for="entitlement in myEntitlements"
            :key="entitlement.id"
            class="rounded-md border border-border bg-background px-4 py-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-foreground">{{ entitlement.feature.label || entitlement.feature.name }}</p>
                <p class="text-xs text-muted-foreground">{{ entitlement["source_entitlement.product.name"] }}</p>
              </div>
              <span class="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {{ entitlement.status }}
              </span>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <p>Quota: {{ entitlement.granted_quota }}</p>
              <p>Used: {{ entitlement.consumed_usage }}</p>
              <p>Start: {{ formatDate(entitlement.start_date) }}</p>
              <p>End: {{ formatDate(entitlement.end_date) }}</p>
            </div>
          </div>
          <div v-if="myEntitlements.length === 0" class="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No personal entitlements found.
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-border bg-card p-6">
      <h3 class="text-base font-semibold text-foreground">402/403 handling</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Billing and permission errors are treated as business states. 402 triggers an upgrade modal; 403 routes to
        permission guidance.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import { api } from "@/api";
import type { components } from "@/api/schema";
import { useSessionStore } from "@/stores/session";
import { platformContextKey, type PlatformContext } from "@/lib/platform-context";

type EntitlementBalanceRead = components["schemas"]["EntitlementBalanceRead"];

const session = useSessionStore();
const platformContext = inject<PlatformContext>(platformContextKey, null);

const teamEntitlements = ref<EntitlementBalanceRead[]>([]);
const myEntitlements = ref<EntitlementBalanceRead[]>([]);

const teamLoading = ref(false);
const myLoading = ref(false);
const teamError = ref<string | null>(null);
const myError = ref<string | null>(null);

const currentTeamId = computed(() => session.teamId ?? platformContext?.teams.value[0]?.uuid ?? "");

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString();
}

async function loadTeamEntitlements() {
  if (!currentTeamId.value) return;
  teamLoading.value = true;
  teamError.value = null;

  const result = await api.GET("/api/v1/entitlements/teams/{team_uuid}", {
    params: { path: { team_uuid: currentTeamId.value } },
  });

  if (result.error) {
    teamError.value = "Failed to load team entitlements.";
    teamEntitlements.value = [];
  } else {
    teamEntitlements.value = result.data?.data ?? [];
  }

  teamLoading.value = false;
}

async function loadMyEntitlements() {
  myLoading.value = true;
  myError.value = null;

  const result = await api.GET("/api/v1/entitlements/me");

  if (result.error) {
    myError.value = "Failed to load personal entitlements.";
    myEntitlements.value = [];
  } else {
    myEntitlements.value = result.data?.data ?? [];
  }

  myLoading.value = false;
}

watch(currentTeamId, () => {
  loadTeamEntitlements();
});

onMounted(() => {
  loadTeamEntitlements();
  loadMyEntitlements();
});
</script>
