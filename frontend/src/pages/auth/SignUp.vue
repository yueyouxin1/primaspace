<template>
  <div class="min-h-screen bg-muted/30 px-4 py-10 text-foreground">
    <div class="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 class="text-xl font-semibold text-foreground">Create account</h1>
      <p class="mt-1 text-sm text-muted-foreground">Start building AI-ready products today.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-xs font-medium text-muted-foreground">Name</label>
          <input
            v-model="nickName"
            type="text"
            class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Your name"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground">Email</label>
          <input
            v-model="email"
            type="email"
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
            placeholder="At least 8 characters"
            required
          />
        </div>
        <button type="submit" class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" :disabled="loading">
          {{ loading ? "Creating..." : "Create account" }}
        </button>
      </form>

      <p v-if="message" class="mt-3 text-xs text-muted-foreground">{{ message }}</p>
      <p v-if="error" class="mt-2 text-xs text-destructive">{{ error }}</p>
      <p v-else class="mt-3 text-xs text-muted-foreground">Already have an account? <RouterLink class="text-primary" to="/signin">Sign in</RouterLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const nickName = ref("");
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const auth = useAuthStore();

async function submit() {
  loading.value = true;
  error.value = null;
  message.value = null;

  const result = await auth.registerAndLogin({
    email: email.value,
    password: password.value,
    nickName: nickName.value || null,
  });

  if (!result.ok) {
    error.value = auth.errorMessage || "Unable to register. Please check your inputs.";
  } else {
    message.value = "Account created. Redirecting to workspace...";
    setTimeout(() => {
      router.push("/app");
    }, 600);
  }

  loading.value = false;
}
</script>
