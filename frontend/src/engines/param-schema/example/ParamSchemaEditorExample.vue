<script setup lang="ts">
import {
  ParamSchemaEditor,
  useParamSchemaEditor,
} from "@/engines/param-schema";
const { state, dispatch } = useParamSchemaEditor();
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <ParamSchemaEditor :state="state" :dispatch="dispatch" class="h-full min-h-0 flex-1" />
  </div>
</template>
