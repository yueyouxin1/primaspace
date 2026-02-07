import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useSessionStore = defineStore("session", () => {
  const userId = ref<string | null>(null);
  const teamId = ref<string | null>(null);
  const workspaceId = ref<string | null>(null);
  const plan = ref<string | null>(null);
  const role = ref<string | null>(null);

  const hasWorkspace = computed(() => Boolean(workspaceId.value));

  function setContext(payload: {
    userId?: string | null;
    teamId?: string | null;
    workspaceId?: string | null;
    plan?: string | null;
    role?: string | null;
  }) {
    if (payload.userId !== undefined) userId.value = payload.userId;
    if (payload.teamId !== undefined) teamId.value = payload.teamId;
    if (payload.workspaceId !== undefined) workspaceId.value = payload.workspaceId;
    if (payload.plan !== undefined) plan.value = payload.plan;
    if (payload.role !== undefined) role.value = payload.role;
  }

  return {
    userId,
    teamId,
    workspaceId,
    plan,
    role,
    hasWorkspace,
    setContext,
  };
});
