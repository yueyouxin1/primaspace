<template>
  <div v-if="modelValue" class="modal-backdrop">
    <div class="modal-card panel">
      <h3 class="modal-title">{{ title }}</h3>
      <p class="muted">{{ description }}</p>
      <div class="modal-actions">
        <button class="primary" type="button" @click="$emit('action')">
          {{ actionText }}
        </button>
        <button class="ghost" type="button" @click="$emit('close')">稍后处理</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  title: string;
  description: string;
  actionText: string;
}>();

defineEmits<{
  (event: "close"): void;
  (event: "action"): void;
}>();
</script>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  z-index: 50;
}

.modal-card {
  width: min(480px, 90vw);
}

.modal-title {
  margin: 0 0 8px;
  font-size: 18px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

button {
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 8px 14px;
  cursor: pointer;
}

.primary {
  background: #6366f1;
  color: white;
}

.ghost {
  border-color: #e2e8f0;
  background: #ffffff;
}
</style>
