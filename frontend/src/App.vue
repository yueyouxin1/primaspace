<template>
  <RouterView />
  <BlockingModal
    :model-value="billingOpen"
    title="余额不足或配额耗尽"
    description="此操作需要额外配额。请升级订阅或充值后继续。"
    action-text="查看计费"
    @close="billingOpen = false"
    @action="goToBilling"
  />
  <BlockingModal
    :model-value="permissionOpen"
    title="权限不足"
    description="你的当前角色无法执行该操作。请联系管理员或申请权限。"
    action-text="查看权限说明"
    @close="permissionOpen = false"
    @action="goToTeam"
  />
  <BlockingModal
    :model-value="authOpen"
    title="登录已过期"
    description="认证凭证缺失或已失效，请重新登录后继续。"
    action-text="去登录"
    @close="authOpen = false"
    @action="goToSignIn"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import BlockingModal from "@/components/BlockingModal.vue";
import { appEvents } from "@/app/events";
import { setPostLoginRedirect } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const auth = useAuthStore();
const billingOpen = ref(false);
const permissionOpen = ref(false);
const authOpen = ref(false);

function goToBilling() {
  billingOpen.value = false;
  router.push("/app/billing");
}

function goToTeam() {
  permissionOpen.value = false;
  router.push("/app/team");
}

function onBilling() {
  billingOpen.value = true;
}

function onPermission() {
  permissionOpen.value = true;
}

function goToSignIn() {
  authOpen.value = false;
  router.push("/signin");
}

function onAuthRequired() {
  if (!authOpen.value) {
    auth.logout();
    setPostLoginRedirect(window.location.pathname + window.location.search);
    authOpen.value = true;
  }
}

onMounted(() => {
  appEvents.addEventListener("billing-required", onBilling as EventListener);
  appEvents.addEventListener("permission-forbidden", onPermission as EventListener);
  appEvents.addEventListener("auth-required", onAuthRequired as EventListener);
});

onUnmounted(() => {
  appEvents.removeEventListener("billing-required", onBilling as EventListener);
  appEvents.removeEventListener("permission-forbidden", onPermission as EventListener);
  appEvents.removeEventListener("auth-required", onAuthRequired as EventListener);
});
</script>
