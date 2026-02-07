import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/api";
import type { components } from "@/api/schema";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth";
import { useSessionStore } from "@/stores/session";

type UserRead = components["schemas"]["UserRead"];

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<UserRead | null>(null);
  const status = ref<AuthStatus>("idle");
  const errorMessage = ref<string | null>(null);

  const isAuthenticated = computed(() => status.value === "authenticated" && Boolean(user.value));

  async function fetchMe() {
    errorMessage.value = null;

    const token = getAccessToken();
    if (!token) {
      user.value = null;
      status.value = "anonymous";
      return null;
    }

    status.value = "loading";
    const result = await api.GET("/api/v1/identity/users/me");

    if (result.error || !result.data?.data) {
      clearAccessToken();
      user.value = null;
      status.value = "anonymous";
      return null;
    }

    user.value = result.data.data;
    status.value = "authenticated";

    const session = useSessionStore();
    session.setContext({ userId: result.data.data.uuid ?? null });

    return user.value;
  }

  async function loginWithPassword(identifier: string, password: string) {
    status.value = "loading";
    errorMessage.value = null;

    const result = await api.POST("/api/v1/identity/token", {
      body: {
        grant_type: "password",
        identifier,
        password,
      },
    });

    if (result.error || !result.data?.data?.access_token) {
      status.value = "error";
      errorMessage.value = "Unable to sign in.";
      return { ok: false, message: errorMessage.value };
    }

    setAccessToken(result.data.data.access_token);
    await fetchMe();

    return { ok: true };
  }

  async function registerAndLogin(payload: { email: string; password: string; nickName?: string | null }) {
    status.value = "loading";
    errorMessage.value = null;

    const registerResult = await api.POST("/api/v1/identity/register", {
      body: {
        email: payload.email,
        password: payload.password,
        nick_name: payload.nickName ?? null,
      },
    });

    if (registerResult.error) {
      status.value = "error";
      errorMessage.value = "Unable to register.";
      return { ok: false, message: errorMessage.value };
    }

    return loginWithPassword(payload.email, payload.password);
  }

  function logout() {
    clearAccessToken();
    user.value = null;
    status.value = "anonymous";
  }

  return {
    user,
    status,
    errorMessage,
    isAuthenticated,
    fetchMe,
    loginWithPassword,
    registerAndLogin,
    logout,
  };
});
