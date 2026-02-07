import { createRouter, createWebHistory } from "vue-router";
import { getAccessToken, setPostLoginRedirect } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/app",
    },
    {
      path: "/signin",
      name: "signin",
      component: () => import("@/pages/auth/SignIn.vue"),
      meta: { title: "Sign in" },
    },
    {
      path: "/signup",
      name: "signup",
      component: () => import("@/pages/auth/SignUp.vue"),
      meta: { title: "Create account" },
    },
    {
      path: "/app",
      component: () => import("@/layouts/PlatformLayout.vue"),
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("@/pages/platform/PlatformHome.vue"),
          meta: { title: "Workspace overview" },
        },
        {
          path: "projects",
          name: "projects",
          component: () => import("@/pages/platform/ProjectsPage.vue"),
          meta: { title: "Projects" },
        },
        {
          path: "resources",
          name: "workspace-resource-library",
          component: () => import("@/pages/platform/WorkspaceResourceLibraryPage.vue"),
          meta: { title: "Resource library" },
        },
        {
          path: "projects/:projectId",
          name: "project-detail",
          component: () => import("@/pages/platform/ProjectDetail.vue"),
          meta: { title: "Project overview" },
        },
        {
          path: "projects/:projectId/resources",
          name: "resource-library",
          component: () => import("@/pages/platform/ResourceLibraryPage.vue"),
          meta: { title: "Project references" },
        },
        {
          path: "projects/:projectId/resources/:resourceId",
          name: "resource-detail",
          component: () => import("@/pages/platform/ResourceDetailPage.vue"),
          meta: { title: "Resource details" },
        },
        {
          path: "team",
          name: "team",
          component: () => import("@/pages/platform/TeamPage.vue"),
          meta: { title: "Team & roles" },
        },
        {
          path: "billing",
          name: "billing",
          component: () => import("@/pages/platform/BillingPage.vue"),
          meta: { title: "Billing & entitlements" },
        },
        {
          path: "lab",
          name: "component-lab",
          component: () => import("@/pages/platform/ComponentLabPage.vue"),
          meta: { title: "Component Lab" },
        },
        {
          path: "lab/:componentId",
          name: "component-lab-detail",
          component: () => import("@/pages/platform/ComponentLabDetailPage.vue"),
          meta: { title: "Component Lab Detail" },
        },
      ],
    },
    {
      path: "/studio/:projectId",
      component: () => import("@/layouts/StudioLayout.vue"),
      children: [
        {
          path: "",
          name: "studio-home",
          component: () => import("@/pages/studio/StudioHomePage.vue"),
          meta: { title: "Studio Runtime" },
        },
        {
          path: "tools/:resourceId",
          name: "studio-tool-runtime",
          component: () => import("@/pages/studio/ToolRuntimePage.vue"),
          meta: { title: "Tool Runtime" },
        },
        {
          path: ":resourceKind/:resourceId",
          name: "studio-resource-runtime",
          component: () => import("@/pages/studio/ResourceRuntimePage.vue"),
          meta: { title: "Resource Runtime" },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/pages/NotFound.vue"),
      meta: { title: "Not found" },
    },
  ],
});

router.beforeEach(async (to) => {
  const isAuthenticated = Boolean(getAccessToken());
  const requiresAuth = to.path.startsWith("/app") || to.path.startsWith("/studio");
  const isAuthPage = to.path === "/signin" || to.path === "/signup";

  if (requiresAuth && !isAuthenticated) {
    setPostLoginRedirect(to.fullPath);
    return "/signin";
  }

  if (isAuthenticated) {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      await auth.fetchMe();
    }
  }

  if (requiresAuth && !useAuthStore().isAuthenticated) {
    setPostLoginRedirect(to.fullPath);
    return "/signin";
  }

  if (isAuthPage && isAuthenticated) {
    return "/app";
  }

  return true;
});

export { router };
