<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import "monaco-editor/min/vs/editor/editor.main.css"
import { cn } from "@/lib/utils"
import { ensureMonacoEnvironment } from "@/lib/monaco/setup"

const props = withDefaults(
  defineProps<{
    modelValue?: string
    language?: string
    theme?: string
    readOnly?: boolean
    height?: string | number
    width?: string | number
    options?: monaco.editor.IStandaloneEditorConstructionOptions
    class?: string
  }>(),
  {
    modelValue: "",
    language: "json",
    theme: "vs",
    readOnly: false,
    height: "280px",
    width: "100%",
    options: () => ({}),
    class: undefined,
  },
)

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
  (event: "ready", editor: monaco.editor.IStandaloneCodeEditor): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const wrapperStyle = computed(() => ({
  height: typeof props.height === "number" ? `${props.height}px` : props.height,
  width: typeof props.width === "number" ? `${props.width}px` : props.width,
}))

let editor: monaco.editor.IStandaloneCodeEditor | null = null
let isSyncingValue = false

function buildOptions(): monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    value: props.modelValue ?? "",
    language: props.language,
    theme: props.theme,
    readOnly: props.readOnly,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 12,
    lineHeight: 18,
    tabSize: 2,
    ...props.options,
  }
}

onMounted(() => {
  if (!containerRef.value) return
  ensureMonacoEnvironment()
  editor = monaco.editor.create(containerRef.value, buildOptions())
  editor.onDidChangeModelContent(() => {
    if (!editor || isSyncingValue) return
    emit("update:modelValue", editor.getValue())
  })
  emit("ready", editor)
})

watch(
  () => props.modelValue,
  (nextValue) => {
    if (!editor) return
    const normalizedValue = nextValue ?? ""
    if (normalizedValue === editor.getValue()) return
    isSyncingValue = true
    editor.setValue(normalizedValue)
    isSyncingValue = false
  },
)

watch(
  () => props.language,
  (language) => {
    if (!editor || !language) return
    const model = editor.getModel()
    if (model) monaco.editor.setModelLanguage(model, language)
  },
)

watch(
  () => props.theme,
  (theme) => {
    if (!editor || !theme) return
    monaco.editor.setTheme(theme)
  },
)

watch(
  () => props.readOnly,
  (readOnly) => {
    if (!editor) return
    editor.updateOptions({ readOnly })
  },
)

watch(
  () => props.options,
  (options) => {
    if (!editor || !options) return
    editor.updateOptions({ ...options })
  },
  { deep: true },
)

onBeforeUnmount(() => {
  editor?.dispose()
  editor = null
})
</script>

<template>
  <div :class="cn('monaco-shell', props.class)" :style="wrapperStyle">
    <div ref="containerRef" class="monaco-container" />
  </div>
</template>

<style scoped>
.monaco-shell {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--card));
  overflow: hidden;
}

.monaco-container {
  height: 100%;
  width: 100%;
}
</style>
