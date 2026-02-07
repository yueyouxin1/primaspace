<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="flex min-h-screen flex-col">
      <header class="border-b border-border/70 bg-gradient-to-r from-background via-background/90 to-muted/40 backdrop-blur">
        <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p class="text-xs text-muted-foreground">Studio runtime</p>
            <h1 class="text-lg font-semibold text-foreground">{{ pageTitle }}</h1>
            <p class="text-xs text-muted-foreground">Project {{ projectId || "--" }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink
              :to="`/app/projects/${projectId}/resources`"
              class="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
            >
              Back to references
            </RouterLink>
            <button
              type="button"
              class="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground"
            >
              Activity log
            </button>
            <div class="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
              <span class="text-[11px] text-muted-foreground">Theme</span>
              <Select v-model="themeStore.mode">
                <SelectTrigger class="h-7 w-[110px] bg-background text-[11px]">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent align="end" class="w-[var(--reka-select-trigger-width)]">
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              class="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              Publish
            </button>
          </div>
        </div>
      </header>

      <main class="flex-1 min-h-0 px-6 py-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThemeStore } from "@/stores/theme";

const route = useRoute();
const projectId = computed(() => String(route.params.projectId || ""));
const pageTitle = computed(() => (route.meta.title as string) || "Runtime panel");
const themeStore = useThemeStore();
</script>
