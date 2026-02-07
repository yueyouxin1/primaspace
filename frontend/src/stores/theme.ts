import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export type ThemeMode = "light" | "dark" | "system";

const storageKey = "prisma-space-theme";
const isClient = typeof window !== "undefined" && typeof document !== "undefined";

function readStoredTheme(): ThemeMode | null {
  if (!isClient) {
    return null;
  }
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return null;
}

function getSystemTheme(): "light" | "dark" {
  if (!isClient || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  if (!isClient) {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(readStoredTheme() ?? "system");
  const resolvedTheme = computed<"light" | "dark">(() => {
    return mode.value === "system" ? getSystemTheme() : mode.value;
  });

  let initialized = false;
  let mediaQuery: MediaQueryList | null = null;
  let mediaHandler: ((event: MediaQueryListEvent) => void) | null = null;

  function setMode(next: ThemeMode) {
    mode.value = next;
  }

  function toggleMode() {
    setMode(resolvedTheme.value === "dark" ? "light" : "dark");
  }

  function init() {
    if (!isClient || initialized) {
      return;
    }
    initialized = true;

    if (window.matchMedia) {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaHandler = (event) => {
        if (mode.value === "system") {
          applyTheme(event.matches ? "dark" : "light");
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", mediaHandler);
      } else {
        mediaQuery.addListener(mediaHandler);
      }
    }
  }

  watch(
    mode,
    (next) => {
      if (isClient) {
        window.localStorage.setItem(storageKey, next);
      }
      applyTheme(resolvedTheme.value);
    },
    { immediate: true },
  );

  return {
    mode,
    resolvedTheme,
    setMode,
    toggleMode,
    init,
  };
});
