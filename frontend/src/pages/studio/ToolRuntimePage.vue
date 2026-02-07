<template>
  <div class="flex h-full min-h-[calc(100vh-200px)] flex-col gap-6">
    <section class="rounded-lg border border-border bg-card/60 p-6">
      <div v-if="status === 'loading'" class="space-y-3">
        <div class="h-5 w-1/3 animate-pulse rounded bg-muted" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>

      <div v-else-if="status === 'error'" class="space-y-3">
        <p class="text-sm text-destructive">{{ error }}</p>
        <Button variant="outline" size="sm" @click="loadTool">Retry</Button>
      </div>

      <div v-else class="space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs text-muted-foreground">Tool runtime editor</p>
            <h2 class="text-lg font-semibold text-foreground">{{ resource?.name || 'Tool' }}</h2>
            <p class="text-xs text-muted-foreground">
              {{ resource?.description || 'Design schema, stage execution, and manage publish lifecycle.' }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{{ workspaceTool?.status || 'workspace' }}</Badge>
            <Badge v-if="publishedTool" variant="secondary">published</Badge>
            <Badge v-if="isDirty" variant="destructive">unsaved</Badge>
            <Button variant="outline" size="sm" @click="loadTool">Refresh</Button>
            <Button size="sm" :disabled="!canSaveDraft" @click="saveDraft">{{ saving ? 'Saving...' : 'Save draft' }}</Button>
          </div>
        </div>
        <p v-if="saveError" class="text-xs text-destructive">{{ saveError }}</p>
      </div>
    </section>

    <section
      v-if="status === 'unsupported'"
      class="rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-700"
    >
      This page only supports `tool` resources. Current type: {{ resource?.resource_type || 'unknown' }}
    </section>

    <Tabs v-else-if="status === 'ready'" v-model="activeTab" class="space-y-4">
      <TabsList>
        <TabsTrigger value="design">Design</TabsTrigger>
        <TabsTrigger value="run">Run</TabsTrigger>
        <TabsTrigger value="versions">Versions</TabsTrigger>
        <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
      </TabsList>

      <TabsContent value="design" class="space-y-6">
        <section class="rounded-lg border border-border bg-card/60 p-6">
          <h3 class="text-sm font-semibold text-foreground">HTTP config</h3>
          <div class="mt-4 grid gap-4 md:grid-cols-3">
            <div class="space-y-2">
              <label class="text-xs font-medium text-muted-foreground">Method</label>
              <select v-model="method" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option v-for="item in methods" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
            <div class="space-y-2 md:col-span-2">
              <label class="text-xs font-medium text-muted-foreground">URL</label>
              <Input v-model="url" placeholder="https://api.example.com/v1/items/{id}" />
              <p v-if="urlError" class="text-[11px] text-destructive">{{ urlError }}</p>
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium text-muted-foreground">Visibility</label>
              <select v-model="visibility" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option v-for="item in visibilities" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
          </div>
          <div class="mt-5 space-y-2">
            <label class="text-xs font-medium text-muted-foreground">LLM function schema (optional JSON)</label>
            <MonacoEditor v-model="llmSchemaText" language="json" height="200px" />
            <p v-if="llmSchemaError" class="text-[11px] text-destructive">{{ llmSchemaError }}</p>
          </div>
        </section>

        <section class="space-y-3 rounded-lg border border-border bg-card/60 p-6">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-foreground">Input schema</h3>
            <Button size="sm" variant="outline" @click="generateInputTemplate">Generate run template</Button>
          </div>
          <div class="h-[520px] min-h-0 overflow-hidden rounded-md border border-border">
            <ParamSchemaEditor :state="inputState" :dispatch="inputDispatch" class="h-full min-h-0" />
          </div>
        </section>

        <section class="space-y-3 rounded-lg border border-border bg-card/60 p-6">
          <h3 class="text-sm font-semibold text-foreground">Output schema</h3>
          <div class="h-[520px] min-h-0 overflow-hidden rounded-md border border-border">
            <ParamSchemaEditor :state="outputState" :dispatch="outputDispatch" class="h-full min-h-0" />
          </div>
        </section>
      </TabsContent>

      <TabsContent value="run" class="space-y-6">
        <section class="rounded-lg border border-border bg-card/60 p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Execution</h3>
              <p class="text-xs text-muted-foreground">Run against workspace, latest published, or any historical version.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select v-model="executionTarget" class="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="workspace">workspace</option>
                <option value="published" :disabled="!publishedTool">latest published</option>
                <option value="version" :disabled="versionOptions.length === 0">version history</option>
              </select>
              <select
                v-if="executionTarget === 'version'"
                v-model="selectedVersionUuid"
                class="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option disabled value="">Select a version</option>
                <option v-for="item in versionOptions" :key="item.uuid" :value="item.uuid">
                  {{ item.version_tag }} · {{ item.status }}
                </option>
              </select>
              <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input v-model="returnRawResponse" type="checkbox" :disabled="executionTarget !== 'workspace'" />
                return raw response
              </label>
            </div>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            Selected instance: {{ executionInstanceUuid || "--" }}
          </p>

          <div class="mt-4 grid gap-5 lg:grid-cols-2">
            <div class="space-y-3">
              <p class="text-xs font-medium text-muted-foreground">Inputs (JSON object)</p>
              <MonacoEditor v-model="executionInputText" language="json" height="260px" />
              <p v-if="executionInputError" class="text-[11px] text-destructive">{{ executionInputError }}</p>
              <Button size="sm" :disabled="!canExecute" @click="executeTool">{{ executing ? 'Executing...' : 'Execute' }}</Button>
            </div>
            <div class="space-y-3">
              <p class="text-xs font-medium text-muted-foreground">Response</p>
              <MonacoEditor :model-value="executionOutputText" language="json" height="260px" read-only />
              <p v-if="executionError" class="text-[11px] text-destructive">{{ executionError }}</p>
            </div>
          </div>
        </section>
      </TabsContent>

      <TabsContent value="versions" class="space-y-6">
        <section class="rounded-lg border border-border bg-card/60 p-6">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2 rounded-md border border-border bg-background/80 p-4 text-xs text-muted-foreground">
              <p class="font-semibold">Workspace draft</p>
              <p>UUID {{ workspaceTool?.uuid || '--' }}</p>
              <p>Tag {{ workspaceTool?.version_tag || '--' }}</p>
              <p>Status {{ workspaceTool?.status || '--' }}</p>
              <div class="flex flex-wrap items-center gap-2 pt-2">
                <Button size="sm" :disabled="!canSaveDraft" @click="saveDraft">{{ saving ? 'Saving...' : 'Save draft' }}</Button>
                <Button size="sm" variant="outline" :disabled="publishing" @click="openPublishDialog">Publish</Button>
              </div>
            </div>
            <div class="space-y-2 rounded-md border border-border bg-background/80 p-4 text-xs text-muted-foreground">
              <p class="font-semibold">Latest published</p>
              <p v-if="publishedTool">UUID {{ publishedTool.uuid }}</p>
              <p v-if="publishedTool">Tag {{ publishedTool.version_tag }}</p>
              <p v-if="publishedTool">Status {{ publishedTool.status }}</p>
              <p v-if="!publishedTool">No published snapshot.</p>
              <div class="pt-2">
                <Button size="sm" variant="outline" :disabled="!publishedTool || archiving" @click="archivePublished">
                  {{ archiving ? 'Archiving...' : 'Archive latest' }}
                </Button>
              </div>
            </div>
          </div>
          <div class="mt-4">
            <p class="text-xs font-medium text-muted-foreground">Version history</p>
            <div v-if="versionsLoading" class="mt-2 space-y-2">
              <div class="h-10 animate-pulse rounded bg-muted" />
              <div class="h-10 animate-pulse rounded bg-muted" />
            </div>
            <div v-else-if="versionsError" class="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {{ versionsError }}
            </div>
            <div v-else class="mt-2 space-y-2">
              <div
                v-for="version in versions"
                :key="version.uuid"
                class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
              >
                <div class="space-y-1 text-muted-foreground">
                  <p class="font-medium text-foreground">{{ version.version_tag }} · {{ version.status }}</p>
                  <p>{{ version.uuid }}</p>
                  <p>{{ formatDateTime(version.created_at) }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" @click="useVersionForRun(version.uuid)">Use in run</Button>
                  <Button
                    v-if="version.status === 'published'"
                    size="sm"
                    variant="outline"
                    :disabled="archiving"
                    @click="archiveSpecificPublished(version.uuid)"
                  >
                    {{ archiving ? 'Archiving...' : 'Archive' }}
                  </Button>
                </div>
              </div>
              <p v-if="versions.length === 0" class="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                No versions found.
              </p>
            </div>
          </div>
          <p v-if="publishError" class="mt-3 text-xs text-destructive">{{ publishError }}</p>
        </section>
      </TabsContent>

      <TabsContent value="dependencies" class="space-y-6">
        <section class="rounded-lg border border-border bg-card/60 p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Dependency graph</h3>
              <p class="text-xs text-muted-foreground">
                Check direct refs and resolved dependencies for each version snapshot.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select
                v-model="dependencyInstanceUuid"
                class="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option disabled value="">Select instance</option>
                <option v-for="item in dependencyInstanceOptions" :key="item.uuid" :value="item.uuid">
                  {{ item.version_tag }} · {{ item.status }}
                </option>
              </select>
              <Button size="sm" variant="outline" :disabled="!dependencyInstanceUuid" @click="loadDependencies">
                Refresh
              </Button>
            </div>
          </div>

          <p v-if="dependencyError" class="mt-3 text-xs text-destructive">{{ dependencyError }}</p>

          <div class="mt-4 grid gap-4 lg:grid-cols-2">
            <div class="space-y-2">
              <p class="text-xs font-medium text-muted-foreground">Direct refs</p>
              <div v-if="dependencyLoading" class="space-y-2">
                <div class="h-10 animate-pulse rounded bg-muted" />
                <div class="h-10 animate-pulse rounded bg-muted" />
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="item in dependencyRefs"
                  :key="item.id"
                  class="rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <p class="font-medium text-foreground">{{ item.target_resource_name }}</p>
                  <p class="text-muted-foreground">{{ item.target_resource_type }} · {{ item.target_version_tag }}</p>
                  <p class="text-muted-foreground">Instance {{ item.target_instance_uuid }}</p>
                </div>
                <p v-if="dependencyRefs.length === 0" class="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No direct refs.
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-medium text-muted-foreground">Resolved dependencies</p>
              <div v-if="dependencyLoading" class="space-y-2">
                <div class="h-10 animate-pulse rounded bg-muted" />
                <div class="h-10 animate-pulse rounded bg-muted" />
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="item in dependencyResolved"
                  :key="item.instance_uuid"
                  class="rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <p class="font-medium text-foreground">{{ item.instance_uuid }}</p>
                  <p class="text-muted-foreground">Resource {{ item.resource_uuid }}</p>
                  <p class="text-muted-foreground">Alias {{ item.alias || '--' }}</p>
                </div>
                <p v-if="dependencyResolved.length === 0" class="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No resolved dependencies.
                </p>
              </div>
            </div>
          </div>
        </section>
      </TabsContent>
    </Tabs>

    <Dialog v-model:open="publishOpen">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Publish version</DialogTitle>
          <DialogDescription>Create immutable snapshot from workspace draft.</DialogDescription>
        </DialogHeader>
        <form class="mt-4 space-y-4" @submit.prevent="publishDraft">
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Version tag</label>
            <Input v-model="publishTag" placeholder="1.0.0" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-muted-foreground">Release notes (optional)</label>
            <Textarea v-model="publishNotes" rows="4" placeholder="Describe this release" />
          </div>
          <p v-if="publishError" class="text-xs text-destructive">{{ publishError }}</p>
          <DialogFooter>
            <Button type="button" variant="outline" @click="publishOpen = false">Cancel</Button>
            <Button type="submit" :disabled="publishing || !publishTag.trim()">{{ publishing ? 'Publishing...' : 'Publish' }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import { api } from "@/api";
import { fetchWithGuards } from "@/api/fetch";
import type { components } from "@/api/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MonacoEditor } from "@/components/ui/monaco";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ParamSchemaEditor,
  exportJsonValue,
  exportParameterSchema,
  importParameterSchema,
  useParamSchemaEditor,
  type ParameterSchema,
  type SchemaBlueprint,
} from "@/engines/param-schema";

type ResourceDetailRead = components["schemas"]["ResourceDetailRead"];
type ToolExecutionRequest = components["schemas"]["ToolExecutionRequest"];
type ReferenceRead = components["schemas"]["ReferenceRead"];
type ResourceDependencyRead = components["schemas"]["ResourceDependencyRead"];
type Status = "idle" | "loading" | "ready" | "error" | "unsupported";
type ExecutionTarget = "workspace" | "published" | "version";

type ToolInstance = {
  uuid: string;
  version_tag: string;
  status: string;
  created_at?: string;
  method: string;
  url: string;
  visibility: string;
  inputs_schema: ParameterSchema[];
  outputs_schema: ParameterSchema[];
  llm_function_schema: Record<string, unknown> | null;
};

const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const visibilities = ["private", "workspace", "public"];

const route = useRoute();
const resourceId = computed(() => String(route.params.resourceId || ""));

const status = ref<Status>("idle");
const error = ref<string | null>(null);
const resource = ref<ResourceDetailRead | null>(null);
const workspaceTool = ref<ToolInstance | null>(null);
const publishedTool = ref<ToolInstance | null>(null);
const publishedUuid = ref<string | null>(null);
const versions = ref<ToolInstance[]>([]);
const versionsLoading = ref(false);
const versionsError = ref<string | null>(null);
const activeTab = ref("design");

const method = ref<(typeof methods)[number]>("GET");
const url = ref("");
const visibility = ref("private");
const llmSchemaText = ref("");

const saving = ref(false);
const saveError = ref<string | null>(null);
const snapshot = ref("");

const executionTarget = ref<ExecutionTarget>("workspace");
const selectedVersionUuid = ref("");
const returnRawResponse = ref(false);
const executionInputText = ref("{}");
const executionOutputText = ref("{}");
const executing = ref(false);
const executionError = ref<string | null>(null);

const dependencyInstanceUuid = ref("");
const dependencyLoading = ref(false);
const dependencyError = ref<string | null>(null);
const dependencyRefs = ref<ReferenceRead[]>([]);
const dependencyResolved = ref<ResourceDependencyRead[]>([]);

const publishOpen = ref(false);
const publishTag = ref("");
const publishNotes = ref("");
const publishing = ref(false);
const archiving = ref(false);
const publishError = ref<string | null>(null);

const inputEditor = useParamSchemaEditor();
const outputEditor = useParamSchemaEditor();

const inputState = computed(() => inputEditor.state.value);
const outputState = computed(() => outputEditor.state.value);
const inputDispatch = inputEditor.dispatch;
const outputDispatch = outputEditor.dispatch;

const urlError = computed(() => {
  if (!url.value.trim()) return null;
  try {
    const parsed = new URL(url.value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must use http:// or https://.";
    }
    return null;
  } catch {
    return "URL must be a valid absolute URL.";
  }
});

const llmSchemaError = computed(() => {
  const text = llmSchemaText.value.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!asObject(parsed)) return "LLM schema must be a JSON object.";
    return null;
  } catch {
    return "LLM schema must be valid JSON.";
  }
});

const executionInputParsed = computed(() => {
  try {
    const parsed = JSON.parse(executionInputText.value || "{}") as unknown;
    if (!asObject(parsed)) return { data: {} as Record<string, unknown>, error: "Inputs must be JSON object." };
    return { data: parsed, error: null as string | null };
  } catch {
    return { data: {} as Record<string, unknown>, error: "Inputs must be valid JSON." };
  }
});

const executionInputError = computed(() => executionInputParsed.value.error);

const versionOptions = computed(() =>
  versions.value.filter((item) => item.uuid !== workspaceTool.value?.uuid),
);

const dependencyInstanceOptions = computed(() => versions.value);

const executionInstanceUuid = computed(() => {
  if (executionTarget.value === "workspace") return workspaceTool.value?.uuid || null;
  if (executionTarget.value === "published") return publishedTool.value?.uuid || null;
  if (!selectedVersionUuid.value) return null;
  return selectedVersionUuid.value;
});

const draftPayload = computed(() => ({
  method: method.value,
  url: url.value.trim() || null,
  visibility: visibility.value,
  inputs_schema: exportParameterSchema(inputState.value.tree),
  outputs_schema: exportParameterSchema(outputState.value.tree),
  llm_function_schema: parseLlmSchema(),
}));

const canSaveDraft = computed(() => {
  if (!workspaceTool.value || saving.value || publishing.value || archiving.value) return false;
  if (urlError.value || llmSchemaError.value) return false;
  return isDirty.value;
});

const canExecute = computed(() => {
  if (!executionInstanceUuid.value || executing.value) return false;
  if (executionInputError.value || urlError.value) return false;
  return true;
});

const isDirty = computed(() => stableStringify(draftPayload.value) !== snapshot.value);

watch(executionTarget, (target) => {
  if (target !== "workspace") returnRawResponse.value = false;
  if (target === "version" && !selectedVersionUuid.value && versionOptions.value.length > 0) {
    selectedVersionUuid.value = versionOptions.value[0].uuid;
  }
});

watch(resourceId, () => {
  loadTool();
}, { immediate: true });

watch(versions, (next) => {
  if (!selectedVersionUuid.value || !next.some((item) => item.uuid === selectedVersionUuid.value)) {
    selectedVersionUuid.value = versionOptions.value[0]?.uuid ?? "";
  }
  if (!dependencyInstanceUuid.value || !next.some((item) => item.uuid === dependencyInstanceUuid.value)) {
    dependencyInstanceUuid.value = workspaceTool.value?.uuid || next[0]?.uuid || "";
  }
});

watch(dependencyInstanceUuid, () => {
  if (status.value === "ready") {
    loadDependencies();
  }
});

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true;
  return window.confirm("You have unsaved changes, leave anyway?");
});

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function errorMessage(rawError: unknown, fallback: string) {
  const obj = asObject(rawError);
  if (!obj) return fallback;
  const status = typeof obj.status === "number" ? obj.status : null;
  const data = asObject(obj.data);
  if (data && typeof data.detail === "string" && data.detail) return data.detail;
  if (status) return `${fallback} (HTTP ${status})`;
  return fallback;
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function normalizeResponseError(
  response: Response,
  body: unknown,
  fallback: string,
) {
  const bodyObj = asObject(body);
  if (bodyObj && typeof bodyObj.detail === "string" && bodyObj.detail) return bodyObj.detail;
  if (bodyObj && typeof bodyObj.msg === "string" && bodyObj.msg) return bodyObj.msg;
  return `${fallback} (HTTP ${response.status})`;
}

async function fetchApiJson(path: string, init?: RequestInit) {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const response = await fetchWithGuards(`${baseUrl}${path}`, {
    method: "GET",
    ...init,
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableSort(item));
  }
  const obj = asObject(value);
  if (!obj) return value;
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    next[key] = stableSort(obj[key]);
  }
  return next;
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableSort(value));
}

function normalizeSchemaType(value: unknown): SchemaBlueprint["type"] | null {
  if (value === "string" || value === "number" || value === "integer" || value === "boolean" || value === "object" || value === "array") {
    return value;
  }
  return null;
}

function normalizeSchemaBlueprint(value: unknown): SchemaBlueprint | null {
  const obj = asObject(value);
  if (!obj) return null;
  const type = normalizeSchemaType(obj.type);
  if (!type) return null;

  const blueprint: SchemaBlueprint = { type };

  if (typeof obj.uid === "number") blueprint.uid = obj.uid;
  if (typeof obj.description === "string") blueprint.description = obj.description;
  if (Array.isArray(obj.enum)) blueprint.enum = obj.enum;
  if (Object.prototype.hasOwnProperty.call(obj, "default")) blueprint.default = obj.default;

  if (Array.isArray(obj.properties)) {
    const children = obj.properties
      .map((item) => normalizeSchemaParameter(item))
      .filter((item): item is ParameterSchema => item !== null);
    if (children.length) blueprint.properties = children;
  }

  if (obj.items) {
    const itemBlueprint = normalizeSchemaBlueprint(obj.items);
    if (itemBlueprint) blueprint.items = itemBlueprint;
  }

  return blueprint;
}

function normalizeSchemaParameter(value: unknown): ParameterSchema | null {
  const obj = asObject(value);
  if (!obj) return null;
  const blueprint = normalizeSchemaBlueprint(obj);
  if (!blueprint) return null;

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) return null;

  const parameter: ParameterSchema = {
    ...blueprint,
    name,
    required: Boolean(obj.required),
    open: obj.open === undefined ? true : Boolean(obj.open),
  };

  if (typeof obj.role === "string") parameter.role = obj.role;
  if (typeof obj.label === "string") parameter.label = obj.label;
  const meta = asObject(obj.meta);
  if (meta) parameter.meta = meta;

  const paramValue = asObject(obj.value);
  if (paramValue && (paramValue.type === "literal" || paramValue.type === "expr" || paramValue.type === "ref")) {
    parameter.value = {
      type: paramValue.type,
      content: paramValue.content,
    };
  }

  return parameter;
}

function normalizeSchemaList(value: unknown): ParameterSchema[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSchemaParameter(item))
    .filter((item): item is ParameterSchema => item !== null);
}

function normalizeTool(value: unknown): ToolInstance | null {
  const obj = asObject(value);
  if (!obj || typeof obj.uuid !== "string") return null;
  return {
    uuid: obj.uuid,
    version_tag: typeof obj.version_tag === "string" ? obj.version_tag : "__workspace__",
    status: typeof obj.status === "string" ? obj.status : "workspace",
    created_at: typeof obj.created_at === "string" ? obj.created_at : undefined,
    method: typeof obj.method === "string" ? obj.method.toUpperCase() : "GET",
    url: typeof obj.url === "string" ? obj.url : "",
    visibility: typeof obj.visibility === "string" ? obj.visibility : "private",
    inputs_schema: normalizeSchemaList(obj.inputs_schema),
    outputs_schema: normalizeSchemaList(obj.outputs_schema),
    llm_function_schema: asObject(obj.llm_function_schema),
  };
}

function parseLlmSchema() {
  const text = llmSchemaText.value.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return asObject(parsed);
  } catch {
    return null;
  }
}

function applyWorkspaceTool(tool: ToolInstance) {
  workspaceTool.value = tool;
  method.value = methods.includes(tool.method as (typeof methods)[number])
    ? (tool.method as (typeof methods)[number])
    : "GET";
  url.value = tool.url;
  visibility.value = visibilities.includes(tool.visibility) ? tool.visibility : "private";
  llmSchemaText.value = tool.llm_function_schema ? JSON.stringify(tool.llm_function_schema, null, 2) : "";
  inputDispatch({ type: "reset", tree: importParameterSchema(tool.inputs_schema) });
  outputDispatch({ type: "reset", tree: importParameterSchema(tool.outputs_schema) });
  snapshot.value = stableStringify(draftPayload.value);
}

function generateInputTemplate() {
  const value = exportJsonValue(inputState.value.tree);
  executionInputText.value = JSON.stringify(asObject(value) || {}, null, 2);
}

async function loadVersions() {
  if (!resourceId.value) {
    versions.value = [];
    return;
  }
  versionsLoading.value = true;
  versionsError.value = null;

  const { response, body } = await fetchApiJson(`/api/v1/resources/${encodeURIComponent(resourceId.value)}/instances`);

  if (!response.ok) {
    versions.value = [];
    versionsError.value = normalizeResponseError(response, body, "Failed to load version history.");
    versionsLoading.value = false;
    return;
  }

  const payload = asObject(body);
  const list = Array.isArray(payload?.data) ? payload.data : [];
  versions.value = list
    .map((item) => normalizeTool(item))
    .filter((item): item is ToolInstance => item !== null);
  versionsLoading.value = false;
}

async function loadDependencies() {
  if (!dependencyInstanceUuid.value) {
    dependencyRefs.value = [];
    dependencyResolved.value = [];
    return;
  }

  dependencyLoading.value = true;
  dependencyError.value = null;

  const [refsResult, resolvedResult] = await Promise.all([
    api.GET("/api/v1/instances/{instance_uuid}/refs", {
      params: { path: { instance_uuid: dependencyInstanceUuid.value } },
    }),
    api.GET("/api/v1/instances/{instance_uuid}/dependencies", {
      params: { path: { instance_uuid: dependencyInstanceUuid.value } },
    }),
  ]);

  if (refsResult.error || resolvedResult.error) {
    dependencyRefs.value = [];
    dependencyResolved.value = [];
    dependencyError.value = refsResult.error
      ? errorMessage(refsResult.error, "Failed to load direct refs.")
      : errorMessage(resolvedResult.error, "Failed to load resolved dependencies.");
    dependencyLoading.value = false;
    return;
  }

  dependencyRefs.value = refsResult.data?.data ?? [];
  dependencyResolved.value = resolvedResult.data?.data ?? [];
  dependencyLoading.value = false;
}

function useVersionForRun(instanceUuid: string) {
  selectedVersionUuid.value = instanceUuid;
  executionTarget.value = "version";
  activeTab.value = "run";
}

async function loadTool() {
  if (!resourceId.value) return;
  status.value = "loading";
  error.value = null;
  saveError.value = null;
  publishError.value = null;
  executionError.value = null;
  versionsError.value = null;
  dependencyError.value = null;
  dependencyRefs.value = [];
  dependencyResolved.value = [];

  const detailsResult = await api.GET("/api/v1/resources/{resource_uuid}", {
    params: { path: { resource_uuid: resourceId.value } },
  });

  if (detailsResult.error) {
    status.value = "error";
    error.value = errorMessage(detailsResult.error, "Failed to load resource details.");
    return;
  }

  const details = detailsResult.data?.data ?? null;
  if (!details) {
    status.value = "error";
    error.value = "Resource details payload is empty.";
    return;
  }

  resource.value = details;
  if ((details.resource_type || "").toLowerCase() !== "tool") {
    status.value = "unsupported";
    return;
  }

  const workspace = normalizeTool(details.workspace_instance);
  if (!workspace) {
    status.value = "error";
    error.value = "Workspace tool instance is invalid.";
    return;
  }

  applyWorkspaceTool(workspace);
  generateInputTemplate();
  publishedUuid.value = details.latest_published_instance_uuid || null;
  publishedTool.value = null;

  if (publishedUuid.value) {
    const publishedResult = await api.GET("/api/v1/instances/{instance_uuid}", {
      params: { path: { instance_uuid: publishedUuid.value } },
    });
    if (!publishedResult.error) {
      publishedTool.value = normalizeTool(publishedResult.data?.data);
    }
  }

  await loadVersions();
  dependencyInstanceUuid.value = workspace.uuid;
  if (executionTarget.value === "version" && !selectedVersionUuid.value) {
    executionTarget.value = "workspace";
  }

  status.value = "ready";
  if (dependencyInstanceUuid.value) {
    await loadDependencies();
  }
}

async function saveDraft() {
  if (!workspaceTool.value) return false;
  if (urlError.value || llmSchemaError.value) {
    saveError.value = "Fix URL / LLM schema validation issues before saving.";
    return false;
  }
  saving.value = true;
  saveError.value = null;

  const result = await api.PUT("/api/v1/instances/{instance_uuid}", {
    params: { path: { instance_uuid: workspaceTool.value.uuid } },
    body: draftPayload.value,
  });

  if (result.error) {
    saveError.value = errorMessage(result.error, "Failed to save draft.");
    saving.value = false;
    return false;
  }

  const savedTool = normalizeTool(result.data?.data);
  if (savedTool) {
    applyWorkspaceTool(savedTool);
  } else {
    snapshot.value = stableStringify(draftPayload.value);
  }

  await loadVersions();
  if (dependencyInstanceUuid.value === workspaceTool.value?.uuid) {
    await loadDependencies();
  }

  saving.value = false;
  return true;
}

function openPublishDialog() {
  publishError.value = null;
  publishOpen.value = true;
}

async function publishDraft() {
  if (!workspaceTool.value) return;
  if (!publishTag.value.trim()) {
    publishError.value = "Version tag is required.";
    return;
  }

  if (isDirty.value) {
    const saveFirst = window.confirm("Unsaved changes detected. Save before publishing?");
    if (!saveFirst) return;
    const ok = await saveDraft();
    if (!ok) {
      publishError.value = "Draft save failed.";
      return;
    }
  }

  publishing.value = true;
  publishError.value = null;

  const result = await api.POST("/api/v1/instances/{instance_uuid}/publish", {
    params: { path: { instance_uuid: workspaceTool.value.uuid } },
    body: {
      version_tag: publishTag.value.trim(),
      version_notes: publishNotes.value.trim() || null,
    },
  });

  if (result.error) {
    publishError.value = errorMessage(result.error, "Failed to publish version.");
    publishing.value = false;
    return;
  }

  publishing.value = false;
  publishOpen.value = false;
  publishTag.value = "";
  publishNotes.value = "";
  await loadTool();
  activeTab.value = "versions";
}

async function archivePublished() {
  if (!publishedTool.value) return;
  await archiveSpecificPublished(publishedTool.value.uuid);
}

async function archiveSpecificPublished(instanceUuid: string) {
  const accepted = window.confirm("Archive published version?");
  if (!accepted) return;
  archiving.value = true;
  publishError.value = null;
  const result = await api.POST("/api/v1/instances/{instance_uuid}/archive", {
    params: { path: { instance_uuid: instanceUuid } },
  });

  if (result.error) {
    publishError.value = errorMessage(result.error, "Failed to archive version.");
    archiving.value = false;
    return;
  }

  archiving.value = false;
  await loadTool();
}

async function executeTool() {
  if (!executionInstanceUuid.value || executionInputError.value) return;
  executing.value = true;
  executionError.value = null;

  const body: ToolExecutionRequest = {
    inputs: executionInputParsed.value.data,
    meta:
      executionTarget.value === "workspace"
        ? { return_raw_response: returnRawResponse.value }
        : undefined,
  };

  const result = await api.POST("/api/v1/execute/instances/{instance_uuid}", {
    params: { path: { instance_uuid: executionInstanceUuid.value } },
    body,
  });

  if (result.error) {
    executionError.value = errorMessage(result.error, "Tool execution failed.");
    executionOutputText.value = "{}";
    executing.value = false;
    return;
  }

  executionOutputText.value = JSON.stringify(result.data?.data ?? {}, null, 2);
  executing.value = false;
}
</script>
