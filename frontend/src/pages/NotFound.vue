<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/30 px-6 text-foreground">
    <div class="max-w-md text-center">
      <h1 class="text-2xl font-semibold">Page not found</h1>
      <p class="mt-2 text-sm text-muted-foreground">The route you requested does not exist.</p>
      <RouterLink class="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" to="/app">
        Back to dashboard
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
