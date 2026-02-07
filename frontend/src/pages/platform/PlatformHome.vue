<template>
  <div class="space-y-10">
    <section
      class="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background via-background to-muted/40 p-8"
    >
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div class="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>
      <div class="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="space-y-6">
          <div class="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1 text-xs text-muted-foreground">
            <span class="h-2 w-2 rounded-full bg-primary" />
            Platform facade · Template-led growth
          </div>
          <div>
            <h2 class="text-3xl font-semibold text-foreground">Build production-ready AI products in days, not months.</h2>
            <p class="mt-3 text-sm text-muted-foreground">
              PrismaSpace combines visual UI building, workflow orchestration, and agent debugging into a single workspace.
              Start from a curated template market and ship faster with confidence.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Browse templates
            </button>
            <RouterLink
              to="/app/projects"
              class="rounded-md border border-border bg-background px-5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              View projects
            </RouterLink>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-border bg-background/70 p-4">
              <p class="text-xs text-muted-foreground">Active workspace</p>
              <p class="mt-2 text-lg font-semibold text-foreground">{{ currentWorkspace?.name || "--" }}</p>
              <p class="mt-1 text-xs text-muted-foreground">UUID: {{ currentWorkspace?.uuid || "--" }}</p>
            </div>
            <div class="rounded-xl border border-border bg-background/70 p-4">
              <p class="text-xs text-muted-foreground">Template market</p>
              <p class="mt-2 text-lg font-semibold text-foreground">{{ formatCompactNumber(templateStats.total) }}</p>
              <p class="mt-1 text-xs text-muted-foreground">Official + community starters</p>
            </div>
            <div class="rounded-xl border border-border bg-background/70 p-4">
              <p class="text-xs text-muted-foreground">Team</p>
              <p class="mt-2 text-lg font-semibold text-foreground">{{ currentTeam?.name || "--" }}</p>
              <p class="mt-1 text-xs text-muted-foreground">Role-based access applies</p>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="rounded-2xl border border-border bg-background/90 p-6 shadow-sm">
            <p class="text-xs font-semibold text-muted-foreground">Conversion funnel</p>
            <h3 class="mt-3 text-lg font-semibold text-foreground">Your next 3 steps</h3>
            <div class="mt-4 space-y-3 text-sm text-muted-foreground">
              <div class="flex items-start gap-3">
                <span class="mt-1 h-2 w-2 rounded-full bg-primary" />
                <div>
                  <p class="font-medium text-foreground">Pick a high-performing template</p>
                  <p class="text-xs">Start from verified patterns and skip cold starts.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                <div>
                  <p class="font-medium text-foreground">Customize UI + workflow</p>
                  <p class="text-xs">All edits stay in sync with draft / published versions.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <p class="font-medium text-foreground">Deploy with guardrails</p>
                  <p class="text-xs">402/403 enforcement keeps billing & permissions safe.</p>
                </div>
              </div>
            </div>
            <div class="mt-5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              Next review: templates updated {{ templateStats.updated }} · {{ templateStats.trending }} trending today
            </div>
          </div>
          <div class="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-5">
            <p class="text-xs font-semibold text-muted-foreground">AI recommendation</p>
            <div class="mt-3 space-y-2">
              <p class="text-sm font-semibold text-foreground">AI is preparing a personalized template lineup.</p>
              <p class="text-xs text-muted-foreground">Sign in to unlock auto-matched blueprints for your product goals.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-foreground">Template marketplace</h3>
          <p class="text-xs text-muted-foreground">Official picks, community trending, and ready-to-ship starter kits.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="filter in templateFilters"
            :key="filter"
            type="button"
            class="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="template in featuredTemplatesDisplay"
          :key="template.id"
          class="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div class="relative h-36 overflow-hidden">
            <div class="absolute inset-0" :class="template.coverClass" />
            <div class="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent" />
            <div class="absolute bottom-3 left-3 flex items-center gap-2">
              <span
                v-if="template.official"
                class="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                Official
              </span>
              <span class="rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                {{ template.difficulty }}
              </span>
            </div>
          </div>
          <div class="space-y-3 p-4">
            <div>
              <h4 class="text-sm font-semibold text-foreground">{{ template.name }}</h4>
              <p class="mt-1 text-xs text-muted-foreground">{{ template.description }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in template.tags"
                :key="tag"
                class="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {{ tag }}
              </span>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>⭐ {{ template.rating }}</span>
              <span>{{ formatCompactNumber(template.uses) }} uses</span>
              <span>{{ template.updated }}</span>
            </div>
            <div class="flex gap-2 opacity-0 transition group-hover:opacity-100">
              <button type="button" class="flex-1 rounded-md border border-border px-3 py-1 text-xs text-foreground">
                Preview
              </button>
              <button type="button" class="flex-1 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground">
                Use template
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div class="rounded-2xl border border-border bg-card p-6">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-base font-semibold text-foreground">Official picks</h4>
              <p class="text-xs text-muted-foreground">Curated templates with best conversion performance.</p>
            </div>
            <button type="button" class="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">
              View all
            </button>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div
              v-for="template in officialTemplatesDisplay"
              :key="template.id"
              class="rounded-xl border border-border bg-background p-4"
            >
              <p class="text-sm font-semibold text-foreground">{{ template.name }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ template.description }}</p>
              <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{{ template.resourceCount }} resources</span>
                <span>{{ template.updated }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-card p-6">
          <h4 class="text-base font-semibold text-foreground">Community trending</h4>
          <p class="mt-1 text-xs text-muted-foreground">Updated every 24 hours.</p>
          <div class="mt-4 space-y-3">
            <div
              v-for="template in trendingTemplatesDisplay"
              :key="template.id"
              class="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
            >
              <div>
                <p class="text-sm font-medium text-foreground">{{ template.name }}</p>
                <p class="text-xs text-muted-foreground">{{ template.category }}</p>
              </div>
              <span class="text-xs text-muted-foreground">{{ template.uses }} uses</span>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { RouterLink } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { platformContextKey, type PlatformContext } from "@/lib/platform-context";


type TemplateCard = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rating: number;
  uses: number;
  updated: string;
  coverClass: string;
  official?: boolean;
  difficulty: string;
};

type CompactTemplate = {
  id: string;
  name: string;
  description: string;
  resourceCount: number;
  updated: string;
};

type TrendingTemplate = {
  id: string;
  name: string;
  category: string;
  uses: string;
};

const session = useSessionStore();
const platformContext = inject<PlatformContext>(platformContextKey, null);


const templateFilters = [
  "All",
  "Official",
  "Community",
  "Agent",
  "Workflow",
  "UiApp",
  "RAG",
  "Customer Support",
];

const featuredTemplates = ref<TemplateCard[]>([
  {
    id: "tmplt-01",
    name: "AI Support Desk",
    description: "Omnichannel customer support with guided escalation workflows.",
    tags: ["Agent", "Workflow", "CRM"],
    rating: 4.9,
    uses: 1820,
    updated: "2 days ago",
    coverClass: "bg-gradient-to-br from-indigo-500/70 via-sky-500/40 to-background",
    official: true,
    difficulty: "Intermediate",
  },
  {
    id: "tmplt-02",
    name: "RAG Onboarding Hub",
    description: "Knowledge ingest + onboarding journey with AI guidance.",
    tags: ["RAG", "UiApp", "KB"],
    rating: 4.8,
    uses: 1350,
    updated: "4 days ago",
    coverClass: "bg-gradient-to-br from-emerald-500/60 via-teal-400/30 to-background",
    official: true,
    difficulty: "Starter",
  },
  {
    id: "tmplt-03",
    name: "Sales Pipeline OS",
    description: "Pipeline analytics, AI insights, and automated follow-ups.",
    tags: ["Analytics", "Workflow", "Agent"],
    rating: 4.7,
    uses: 980,
    updated: "1 week ago",
    coverClass: "bg-gradient-to-br from-orange-400/70 via-rose-500/40 to-background",
    official: false,
    difficulty: "Advanced",
  },
  {
    id: "tmplt-04",
    name: "Product Research Lab",
    description: "Multi-source research agent with structured synthesis.",
    tags: ["Agent", "KB", "Workflow"],
    rating: 4.9,
    uses: 1560,
    updated: "3 days ago",
    coverClass: "bg-gradient-to-br from-violet-500/70 via-fuchsia-400/30 to-background",
    official: false,
    difficulty: "Intermediate",
  },
]);

const featuredTemplatesDisplay = computed(() =>
  featuredTemplates.value.length
    ? featuredTemplates.value
    : [
        {
          id: "placeholder-01",
          name: "Templates are syncing",
          description: "Check back in a moment for curated starters.",
          tags: ["UiApp", "Workflow"],
          rating: 0,
          uses: 0,
          updated: "Just now",
          coverClass: "bg-gradient-to-br from-slate-200/80 via-background to-background",
          official: true,
          difficulty: "Starter",
        },
      ],
);

const officialTemplates = ref<CompactTemplate[]>([
  {
    id: "off-01",
    name: "Customer Success Command",
    description: "Unified success ops with retention workflows.",
    resourceCount: 5,
    updated: "Updated yesterday",
  },
  {
    id: "off-02",
    name: "AI Analytics Studio",
    description: "Dashboard + agent insights for product teams.",
    resourceCount: 4,
    updated: "Updated 3 days ago",
  },
  {
    id: "off-03",
    name: "Operations Copilot",
    description: "Process automation with risk checks and audit logs.",
    resourceCount: 6,
    updated: "Updated last week",
  },
  {
    id: "off-04",
    name: "Design-to-Deploy",
    description: "UiApp builder with rapid preview cycles.",
    resourceCount: 3,
    updated: "Updated 2 weeks ago",
  },
]);

const officialTemplatesDisplay = computed(() =>
  officialTemplates.value.length
    ? officialTemplates.value
    : [
        {
          id: "off-placeholder",
          name: "Official picks loading",
          description: "We will surface the best performing kits here.",
          resourceCount: 0,
          updated: "Just now",
        },
      ],
);

const trendingTemplates = ref<TrendingTemplate[]>([
  { id: "tr-01", name: "FinOps Monitor", category: "Analytics", uses: "+240" },
  { id: "tr-02", name: "Recruiting Hub", category: "HR Ops", uses: "+198" },
  { id: "tr-03", name: "Growth Sprint Lab", category: "Marketing", uses: "+176" },
  { id: "tr-04", name: "Agent QA Suite", category: "Engineering", uses: "+142" },
]);

const trendingTemplatesDisplay = computed(() =>
  trendingTemplates.value.length
    ? trendingTemplates.value
    : [
        { id: "tr-placeholder", name: "Community feed warming up", category: "Community", uses: "+0" },
      ],
);

const templateStats = {
  total: 124,
  updated: "24 hours",
  trending: "36",
  seats: "3",
  quota: "Healthy",
};

const currentWorkspaceId = computed(() => session.workspaceId ?? "");
const currentWorkspace = computed(
  () => platformContext?.workspaces.value.find((workspace) => workspace.uuid === currentWorkspaceId.value) ?? null,
);
const currentTeam = computed(
  () => platformContext?.teams.value.find((team) => team.uuid === session.teamId) ?? null,
);

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}
</script>
