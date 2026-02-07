<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getLabComponent } from "./component-lab/registry";

const route = useRoute();
const router = useRouter();

const componentId = computed(() => String(route.params.componentId ?? ""));
const component = computed(() => getLabComponent(componentId.value));

const exampleComponent = computed(() => {
  if (!component.value?.exampleLoader) return null;
  return defineAsyncComponent(component.value.exampleLoader);
});

function goBack() {
  router.push({ name: "component-lab" });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
    <header class="shrink-0 flex flex-wrap items-center justify-between gap-4">
      <div>
        <button
          type="button"
          class="mb-2 flex items-center gap-2 text-xs text-muted-foreground"
          @click="goBack"
        >
          <span class="text-lg">←</span>
          Back to component lab
        </button>
        <h1 class="text-2xl font-semibold text-foreground">{{ component?.name ?? "Component" }}</h1>
        <p class="text-sm text-muted-foreground">{{ component?.description ?? "Preview details unavailable." }}</p>
      </div>
      <span class="rounded-full border border-border bg-background px-4 py-1 text-xs text-muted-foreground">
        {{ component?.status ?? "unknown" }}
      </span>
    </header>

    <div v-if="!component" class="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      Component not found. Return to the lab to select a valid item.
    </div>

    <div v-else-if="exampleComponent" class="flex-1 min-h-0 overflow-hidden">
      <component :is="exampleComponent" class="h-full min-h-0" />
    </div>

    <div v-else class="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      Demo content coming soon.
    </div>
  </div>
</template>
