<script setup lang="ts">
import { labComponents } from "./component-lab/registry";
import { useRouter } from "vue-router";

const router = useRouter();

const statusStyles: Record<string, string> = {
  stable: "bg-emerald-100 text-emerald-700",
  beta: "bg-sky-100 text-sky-700",
  wip: "bg-amber-100 text-amber-700",
};

function goTo(componentId: string) {
  router.push({ name: "component-lab-detail", params: { componentId } });
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-foreground">UI Component Lab</h1>
        <p class="text-sm text-muted-foreground">Preview and validate PrismaSpace custom UI components.</p>
      </div>
      <div class="rounded-full border border-border bg-background px-4 py-1 text-xs text-muted-foreground">
        Internal preview · platform scoped
      </div>
    </header>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="component in labComponents"
        :key="component.id"
        type="button"
        class="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        @click="goTo(component.id)"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-foreground">{{ component.name }}</h2>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-medium"
            :class="statusStyles[component.status]"
          >
            {{ component.status }}
          </span>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">{{ component.description }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="tag in component.tags"
            :key="tag"
            class="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            {{ tag }}
          </span>
        </div>
        <p v-if="component.previewNote" class="mt-4 text-xs text-muted-foreground">
          {{ component.previewNote }}
        </p>
        <div class="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span class="rounded-full border border-border px-2 py-0.5">Click to open</span>
          <span class="text-foreground/60">→</span>
        </div>
      </button>
    </section>
  </div>
</template>
