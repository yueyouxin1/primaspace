<template>
  <div class="min-h-screen bg-muted/30 px-4 py-10 text-foreground">
    <div class="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 class="text-xl font-semibold text-foreground">Sign in</h1>
      <p class="mt-1 text-sm text-muted-foreground">Access your workspace and billing context.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-xs font-medium text-muted-foreground">Email or phone</label>
          <input
            v-model="identifier"
            type="text"
            class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="you@company.com"
            required
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground">Password</label>
          <input
            v-model="password"
            type="password"
            class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit" class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" :disabled="loading">
          {{ loading ? "Signing in..." : "Sign in" }}
        </button>
      </form>

      <p v-if="error" class="mt-3 text-xs text-destructive">{{ error }}</p>
      <p v-else class="mt-3 text-xs text-muted-foreground">New here? <RouterLink class="text-primary" to="/signup">Create an account</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { consumePostLoginRedirect } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const identifier = ref("");
const password = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const auth = useAuthStore();

async function submit() {
  loading.value = true;
  error.value = null;

  const result = await auth.loginWithPassword(identifier.value, password.value);

  if (!result.ok) {
    error.value = auth.errorMessage || "Unable to sign in. Please check your credentials.";
  } else {
    const redirect = consumePostLoginRedirect() || "/app";
    await router.push(redirect);
  }

  loading.value = false;
}
</script>
