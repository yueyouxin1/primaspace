<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { SchemaNode, SchemaType, ValueRefContent } from "../core";
import Input from "@/components/ui/input/Input.vue";
import Textarea from "@/components/ui/textarea/Textarea.vue";
import Switch from "@/components/ui/switch/Switch.vue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MonacoEditor } from "@/components/ui/monaco";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { canEditFieldInMode, type ParamSchemaRuntimeMode, type SchemaEditableField } from "./mode";

const props = withDefaults(
  defineProps<{
    node: SchemaNode | null;
    canEdit?: (node: SchemaNode) => boolean;
    roleOptions?: string[];
    mode?: ParamSchemaRuntimeMode;
  }>(),
  {
    mode: "define",
  },
);

const emit = defineEmits<{
  (event: "set-field", payload: { nodeId: string; field: keyof SchemaNode; value: unknown }): void;
  (event: "change-type", payload: { nodeId: string; nextType: SchemaType }): void;
  (event: "wrap-array", payload: { nodeId: string }): void;
  (event: "unwrap-array", payload: { nodeId: string }): void;
}>();

const schemaTypes: SchemaType[] = ["string", "number", "integer", "boolean", "object", "array"];
const UNSET_VALUE = "__unset__";
const VALUE_UNSET = "__value_unset__";

const displayValue = computed(() => {
  if (!props.node?.value) return "";
  const content = props.node.value.content;
  if (typeof content === "string" || typeof content === "number" || typeof content === "boolean") {
    return String(content);
  }
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
});

const canAccessNode = computed(() => (props.node ? (props.canEdit ? props.canEdit(props.node) : true) : false));
const isPropertyNode = computed(() => props.node?.kind === "property");

function canEditField(field: SchemaEditableField) {
  if (!props.node) return false;
  return canAccessNode.value && canEditFieldInMode(props.mode, field);
}

const canEditType = computed(() => canEditField("type"));
const canEditName = computed(() => isPropertyNode.value && canEditField("name"));
const canEditLabel = computed(() => canEditField("label"));
const canEditDescription = computed(() => canEditField("description"));
const canEditRole = computed(() => canEditField("role"));
const canEditRequired = computed(() => isPropertyNode.value && canEditField("required"));
const canEditOpen = computed(() => isPropertyNode.value && canEditField("open"));
const canEditDefault = computed(() => canEditField("default"));
const canEditEnum = computed(() => canEditField("enum"));
const canEditMeta = computed(() => canEditField("meta"));
const canEditValue = computed(() => canEditField("value"));

const showTypeField = computed(() => props.mode !== "bind" && props.mode !== "refine");
const showNameField = computed(() => isPropertyNode.value && props.mode !== "bind");
const showLabelField = computed(() => props.mode === "define" || props.mode === "read");
const showDescriptionField = computed(() => props.mode === "define" || props.mode === "read");
const showRoleField = computed(() => props.mode === "define" || props.mode === "read");
const showPropertyFlags = computed(
  () => isPropertyNode.value && (props.mode === "define" || props.mode === "read"),
);
const showConstraints = computed(() => props.mode !== "bind" && props.mode !== "refine");
const showDefaultEditor = computed(() => props.mode === "define" || props.mode === "default" || props.mode === "read");
const showEnumEditor = computed(() => props.mode === "define" || props.mode === "read");
const showAdvancedMeta = computed(() => props.mode === "define" || props.mode === "read");
const showRuntimeValue = computed(
  () => props.mode === "define" || props.mode === "refine" || props.mode === "bind" || props.mode === "read",
);
const showArrayWrapActions = computed(() => props.mode === "define" || props.mode === "read");

const enumError = ref<string | null>(null);
const defaultError = ref<string | null>(null);
const metaError = ref<string | null>(null);
const valueError = ref<string | null>(null);
const defaultText = ref("");
const enumText = ref("");
const metaText = ref("");
const valueLiteralText = ref("");
const valueExprText = ref("");
const valueRefBlockId = ref("");
const valueRefPath = ref("");
const valueRefSource = ref("");

watch(
  () => props.node?.id,
  () => {
    enumError.value = null;
    defaultError.value = null;
    metaError.value = null;
    valueError.value = null;
    defaultText.value = serializeJson(props.node?.default);
    enumText.value = serializeJson(props.node?.enum);
    metaText.value = serializeJson(props.node?.meta);
    syncValueDrafts();
  },
  { immediate: true },
);

watch(
  () => props.node?.default,
  (nextDefault) => {
    defaultText.value = serializeJson(nextDefault);
  },
);

watch(
  () => props.node?.enum,
  (nextEnum) => {
    enumText.value = serializeJson(nextEnum);
  },
);

watch(
  () => props.node?.meta,
  (nextMeta) => {
    metaText.value = serializeJson(nextMeta);
  },
);

watch(
  () => props.node?.value,
  () => {
    syncValueDrafts();
  },
  { deep: true },
);

function syncValueDrafts() {
  const value = props.node?.value;
  if (!value) {
    valueLiteralText.value = "";
    valueExprText.value = "";
    valueRefBlockId.value = "";
    valueRefPath.value = "";
    valueRefSource.value = "";
    return;
  }
  if (value.type === "literal") {
    valueLiteralText.value = serializeJson(value.content);
    valueExprText.value = "";
    valueRefBlockId.value = "";
    valueRefPath.value = "";
    valueRefSource.value = "";
    return;
  }
  if (value.type === "expr") {
    valueExprText.value = value.content ?? "";
    valueLiteralText.value = "";
    valueRefBlockId.value = "";
    valueRefPath.value = "";
    valueRefSource.value = "";
    return;
  }
  valueRefBlockId.value = value.content.blockID ?? "";
  valueRefPath.value = value.content.path ?? "";
  valueRefSource.value = value.content.source ?? "";
  valueLiteralText.value = "";
  valueExprText.value = "";
}

function onSetField(field: keyof SchemaNode, value: unknown) {
  if (!props.node) return;
  if (!canEditField(field as SchemaEditableField)) return;
  emit("set-field", { nodeId: props.node.id, field, value });
}

function onChangeType(nextType: SchemaType) {
  if (!props.node || props.node.type === nextType) return;
  if (!schemaTypes.includes(nextType)) return;
  if (!canEditType.value) return;
  emit("change-type", { nodeId: props.node.id, nextType });
}

function onWrapArray() {
  if (!props.node || !canEditType.value) return;
  emit("wrap-array", { nodeId: props.node.id });
}

function onUnwrapArray() {
  if (!props.node || !canEditType.value) return;
  emit("unwrap-array", { nodeId: props.node.id });
}

function onSetDefault(raw: string) {
  if (!props.node || !canEditDefault.value) return;
  const parsed = parseValueByType(raw, props.node.type, "default");
  if (!parsed.ok) {
    defaultError.value = parsed.error;
    return;
  }
  defaultError.value = null;
  emit("set-field", { nodeId: props.node.id, field: "default", value: parsed.value });
}

function onSetValueLiteral(raw: string) {
  if (!props.node || !canEditValue.value) return;
  const parsed = parseValueByType(raw, props.node.type, "value");
  if (!parsed.ok) {
    valueError.value = parsed.error;
    return;
  }
  valueError.value = null;
  if (parsed.value === undefined) {
    emit("set-field", { nodeId: props.node.id, field: "value", value: undefined });
    return;
  }
  emit("set-field", {
    nodeId: props.node.id,
    field: "value",
    value: { type: "literal", content: parsed.value },
  });
}

function onSetValueExpr(raw: string) {
  if (!props.node || !canEditValue.value) return;
  valueError.value = null;
  if (!raw.trim()) {
    emit("set-field", { nodeId: props.node.id, field: "value", value: undefined });
    return;
  }
  emit("set-field", { nodeId: props.node.id, field: "value", value: { type: "expr", content: raw } });
}

function onSetValueRefField(field: keyof ValueRefContent, raw: string) {
  if (!props.node || !canEditValue.value) return;
  if (field === "blockID") valueRefBlockId.value = raw;
  if (field === "path") valueRefPath.value = raw;
  if (field === "source") valueRefSource.value = raw;
  const nextRef: ValueRefContent = {
    blockID: valueRefBlockId.value,
    path: valueRefPath.value,
  };
  if (valueRefSource.value.trim()) nextRef.source = valueRefSource.value.trim();
  emit("set-field", { nodeId: props.node.id, field: "value", value: { type: "ref", content: nextRef } });
}

function onValueTypeChange(nextType: string) {
  if (!props.node || !canEditValue.value) return;
  valueError.value = null;
  if (nextType === VALUE_UNSET) {
    emit("set-field", { nodeId: props.node.id, field: "value", value: undefined });
    return;
  }
  if (nextType === "literal") {
    emit("set-field", {
      nodeId: props.node.id,
      field: "value",
      value: { type: "literal", content: getDefaultLiteral(props.node.type) },
    });
    return;
  }
  if (nextType === "expr") {
    emit("set-field", { nodeId: props.node.id, field: "value", value: { type: "expr", content: "" } });
    return;
  }
  emit("set-field", {
    nodeId: props.node.id,
    field: "value",
    value: { type: "ref", content: { blockID: "", path: "" } },
  });
}

function parseValueByType(
  raw: string,
  type: SchemaType,
  target: "default" | "value",
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (raw.trim() === "") {
    return { ok: true, value: undefined };
  }

  if (type === "string") {
    return { ok: true, value: raw };
  }

  if (type === "boolean") {
    if (raw === "true" || raw === "false") {
      return { ok: true, value: raw === "true" };
    }
    return { ok: false, error: `${target === "default" ? "Default" : "Value"} must be true or false.` };
  }

  if (type === "number" || type === "integer") {
    const numberValue = Number(raw);
    if (Number.isNaN(numberValue)) {
      return { ok: false, error: `${target === "default" ? "Default" : "Value"} must be a valid number.` };
    }
    return { ok: true, value: type === "integer" ? Math.trunc(numberValue) : numberValue };
  }

  try {
    const parsed = JSON.parse(raw);
    if (type === "object" && (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null)) {
      return { ok: false, error: `${target === "default" ? "Default" : "Value"} must be a JSON object.` };
    }
    if (type === "array" && !Array.isArray(parsed)) {
      return { ok: false, error: `${target === "default" ? "Default" : "Value"} must be a JSON array.` };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: `${target === "default" ? "Default" : "Value"} must be valid JSON.` };
  }
}

function getDefaultLiteral(type: SchemaType): unknown {
  if (type === "string") return "";
  if (type === "number" || type === "integer") return 0;
  if (type === "boolean") return false;
  if (type === "object") return {};
  if (type === "array") return [];
  return "";
}

function serializeJson(value: unknown) {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function onSetEnum(raw: string) {
  if (!props.node || !canEditEnum.value) return;
  if (raw.trim() === "") {
    enumError.value = null;
    emit("set-field", { nodeId: props.node.id, field: "enum", value: undefined });
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      enumError.value = "Enum must be a JSON array.";
      return;
    }
    enumError.value = null;
    emit("set-field", { nodeId: props.node.id, field: "enum", value: parsed });
  } catch {
    enumError.value = "Enum must be valid JSON.";
  }
}

function onSetMeta(raw: string) {
  if (!props.node || !canEditMeta.value) return;
  if (raw.trim() === "") {
    metaError.value = null;
    emit("set-field", { nodeId: props.node.id, field: "meta", value: undefined });
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      metaError.value = "Meta must be a JSON object.";
      return;
    }
    metaError.value = null;
    emit("set-field", { nodeId: props.node.id, field: "meta", value: parsed });
  } catch {
    metaError.value = "Meta must be valid JSON.";
  }
}

const defaultDisplay = computed(() => defaultText.value);
const enumDisplay = computed(() => enumText.value);
const metaDisplay = computed(() => metaText.value);
const currentValueType = computed(() => props.node?.value?.type ?? VALUE_UNSET);
const currentValueSection = computed(() => {
  const sections: string[] = [];
  if (showRuntimeValue.value) sections.push("runtime-value");
  if (showConstraints.value) sections.push("constraints");
  return sections;
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background">
    <div class="flex items-center justify-between border-b px-3 py-2 text-xs font-medium text-muted-foreground">
      <span>Details</span>
      <span v-if="node" class="text-[10px] font-mono text-muted-foreground" :title="node.id">
        id: {{ node.id.slice(0, 8) }}
      </span>
    </div>
    <div v-if="!node" class="flex-1 p-4 text-sm text-muted-foreground">Select a node to edit.</div>
    <div v-else class="flex-1 space-y-4 overflow-auto p-4">
      <div v-if="showTypeField" class="grid gap-2">
        <label class="text-xs font-medium text-muted-foreground">Type</label>
        <Select :disabled="!canEditType" :model-value="node.type" @update:modelValue="onChangeType($event as SchemaType)">
          <SelectTrigger class="h-9 text-sm">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="type in schemaTypes" :key="type" :value="type">{{ type }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div v-if="showNameField" class="grid gap-2">
        <label class="text-xs font-medium text-muted-foreground">Name</label>
        <Input
          :disabled="!canEditName"
          :model-value="node.name ?? ''"
          placeholder="property_name"
          @update:modelValue="onSetField('name', $event)"
        />
      </div>

      <div v-if="showLabelField" class="grid gap-2">
        <label class="text-xs font-medium text-muted-foreground">Label</label>
        <Input
          :disabled="!canEditLabel"
          :model-value="node.label ?? ''"
          placeholder="Label"
          @update:modelValue="onSetField('label', $event)"
        />
      </div>

      <div v-if="showDescriptionField" class="grid gap-2">
        <label class="text-xs font-medium text-muted-foreground">Description</label>
        <Textarea
          :disabled="!canEditDescription"
          :model-value="node.description ?? ''"
          placeholder="Describe this parameter"
          @update:modelValue="onSetField('description', $event)"
        />
      </div>

      <div v-if="showPropertyFlags" class="grid grid-cols-2 gap-3">
        <label class="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            :checked="node.required ?? false"
            :disabled="!canEditRequired"
            @update:checked="onSetField('required', $event)"
          />
          Required
        </label>
        <label class="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            :checked="node.open ?? true"
            :disabled="!canEditOpen"
            @update:checked="onSetField('open', $event)"
          />
          Open
        </label>
      </div>

      <div v-if="showRoleField" class="grid gap-2">
        <label class="text-xs font-medium text-muted-foreground">Role</label>
        <Select
          v-if="roleOptions && roleOptions.length"
          :disabled="!canEditRole"
          :model-value="node.role ?? UNSET_VALUE"
          @update:modelValue="onSetField('role', $event === UNSET_VALUE ? undefined : $event)"
        >
          <SelectTrigger class="h-9 text-sm">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="UNSET_VALUE">Unset</SelectItem>
            <SelectItem v-for="role in roleOptions" :key="role" :value="role">{{ role }}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          v-else
          :disabled="!canEditRole"
          :model-value="node.role ?? ''"
          placeholder="system.type"
          @update:modelValue="onSetField('role', $event)"
        />
      </div>

      <Accordion type="multiple" :default-value="currentValueSection" class="space-y-2">
        <AccordionItem v-if="showRuntimeValue" value="runtime-value">
          <AccordionTrigger class="text-xs">Runtime Value</AccordionTrigger>
          <AccordionContent container-class="overflow-visible" class="space-y-4 pt-2">
            <div class="grid gap-2">
              <label class="text-xs font-medium text-muted-foreground">Value Mode</label>
              <Select :disabled="!canEditValue" :model-value="currentValueType" @update:modelValue="onValueTypeChange(String($event))">
                <SelectTrigger class="h-9 text-sm">
                  <SelectValue placeholder="Unset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="VALUE_UNSET">Unset</SelectItem>
                  <SelectItem value="literal">Literal</SelectItem>
                  <SelectItem value="expr">Expression</SelectItem>
                  <SelectItem value="ref">Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div v-if="currentValueType === 'literal'" class="grid gap-2">
              <label class="text-xs font-medium text-muted-foreground">Literal Value</label>
              <Input
                v-if="node.type === 'string' || node.type === 'number' || node.type === 'integer'"
                :disabled="!canEditValue"
                :model-value="valueLiteralText"
                :placeholder="node.type === 'string' ? 'text' : '0'"
                @update:modelValue="onSetValueLiteral(String($event))"
              />
              <Select
                v-else-if="node.type === 'boolean'"
                :disabled="!canEditValue"
                :model-value="valueLiteralText || UNSET_VALUE"
                @update:modelValue="onSetValueLiteral($event === UNSET_VALUE ? '' : String($event))"
              >
                <SelectTrigger class="h-9 text-sm">
                  <SelectValue placeholder="Unset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="UNSET_VALUE">Unset</SelectItem>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
              <MonacoEditor
                v-else
                :model-value="valueLiteralText"
                language="json"
                height="180px"
                :read-only="!canEditValue"
                @update:modelValue="onSetValueLiteral($event)"
              />
            </div>

            <div v-else-if="currentValueType === 'expr'" class="grid gap-2">
              <label class="text-xs font-medium text-muted-foreground">Expression</label>
              <Textarea
                :disabled="!canEditValue"
                :model-value="valueExprText"
                placeholder="{{ expression }}"
                @update:modelValue="onSetValueExpr(String($event))"
              />
            </div>

            <div v-else-if="currentValueType === 'ref'" class="grid gap-2">
              <label class="text-xs font-medium text-muted-foreground">Reference Block ID</label>
              <Input
                :disabled="!canEditValue"
                :model-value="valueRefBlockId"
                placeholder="block-uuid"
                @update:modelValue="onSetValueRefField('blockID', String($event))"
              />
              <label class="text-xs font-medium text-muted-foreground">Reference Path</label>
              <Input
                :disabled="!canEditValue"
                :model-value="valueRefPath"
                placeholder="output.result"
                @update:modelValue="onSetValueRefField('path', String($event))"
              />
              <label class="text-xs font-medium text-muted-foreground">Reference Source (Optional)</label>
              <Input
                :disabled="!canEditValue"
                :model-value="valueRefSource"
                placeholder="loop-block-output"
                @update:modelValue="onSetValueRefField('source', String($event))"
              />
            </div>

            <Alert v-if="valueError" variant="destructive">
              <AlertTitle>Invalid value</AlertTitle>
              <AlertDescription>{{ valueError }}</AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem v-if="showConstraints" value="constraints">
          <AccordionTrigger class="text-xs">Constraints</AccordionTrigger>
          <AccordionContent container-class="overflow-visible" class="space-y-4 pt-2">
            <div v-if="showDefaultEditor" class="grid gap-2">
              <label class="text-xs font-medium text-muted-foreground">Default</label>
              <Input
                v-if="node.type === 'string'"
                :disabled="!canEditDefault"
                :model-value="defaultDisplay"
                placeholder="Default string"
                @update:modelValue="onSetDefault(String($event))"
              />
              <Select
                v-else-if="node.type === 'boolean'"
                :disabled="!canEditDefault"
                :model-value="defaultDisplay || UNSET_VALUE"
                @update:modelValue="onSetDefault($event === UNSET_VALUE ? '' : String($event))"
              >
                <SelectTrigger class="h-9 text-sm">
                  <SelectValue placeholder="Unset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="UNSET_VALUE">Unset</SelectItem>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
              <Input
                v-else-if="node.type === 'number' || node.type === 'integer'"
                :disabled="!canEditDefault"
                :model-value="defaultDisplay"
                type="number"
                placeholder="Default number"
                @update:modelValue="onSetDefault(String($event))"
              />
              <MonacoEditor
                v-else
                :model-value="defaultDisplay"
                language="json"
                height="200px"
                :read-only="!canEditDefault"
                @update:modelValue="onSetDefault($event)"
              />
              <Alert v-if="defaultError" variant="destructive">
                <AlertTitle>Invalid default</AlertTitle>
                <AlertDescription>{{ defaultError }}</AlertDescription>
              </Alert>
            </div>

            <div v-if="showEnumEditor" class="grid gap-2">
              <label class="text-xs font-medium text-muted-foreground">Enum (JSON array)</label>
              <MonacoEditor
                :model-value="enumDisplay"
                language="json"
                height="180px"
                :read-only="!canEditEnum"
                @update:modelValue="onSetEnum($event)"
              />
              <Alert v-if="enumError" variant="destructive">
                <AlertTitle>Invalid enum</AlertTitle>
                <AlertDescription>{{ enumError }}</AlertDescription>
              </Alert>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem v-if="showAdvancedMeta" value="advanced">
          <AccordionTrigger class="text-xs">Advanced</AccordionTrigger>
          <AccordionContent container-class="overflow-visible" class="space-y-4 pt-2">
            <div class="grid gap-2">
              <label class="text-xs font-medium text-muted-foreground">Meta (JSON object)</label>
              <MonacoEditor
                :model-value="metaDisplay"
                language="json"
                height="180px"
                :read-only="!canEditMeta"
                @update:modelValue="onSetMeta($event)"
              />
              <Alert v-if="metaError" variant="destructive">
                <AlertTitle>Invalid meta</AlertTitle>
                <AlertDescription>{{ metaError }}</AlertDescription>
              </Alert>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <slot name="value-editor" :node="node" :disabled="!canEditValue" :display-value="displayValue" />

      <div v-if="showArrayWrapActions" class="flex gap-2">
        <Button type="button" size="sm" variant="outline" :disabled="!canEditType" @click="onWrapArray">
          Wrap Array
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="!canEditType || node.type !== 'array'"
          @click="onUnwrapArray"
        >
          Unwrap Array
        </Button>
      </div>
    </div>
  </div>
</template>
