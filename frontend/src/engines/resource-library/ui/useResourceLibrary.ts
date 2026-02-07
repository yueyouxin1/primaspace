import { onBeforeUnmount, shallowRef, watch, type Ref } from "vue";
import { createResourceLibraryRuntime, selectFilteredResources } from "../core";
import { createResourceLibraryService } from "../adapters";

export interface ResourceLibraryContext {
  workspaceId: Ref<string | null>;
  projectId: Ref<string | null>;
}

export function useResourceLibrary(context: ResourceLibraryContext) {
  const runtime = createResourceLibraryRuntime();
  const service = createResourceLibraryService(runtime);
  const state = shallowRef(runtime.getState());

  const unsubscribe = runtime.subscribe((next) => next, (nextState) => {
    state.value = nextState;
  });

  const refresh = async () => {
    if (!context.projectId.value) return;
    await service.loadResourceTypes();
    await service.loadProjectResources(context.projectId.value);
  };

  const addReference = async (payload: Parameters<typeof service.addReference>[1]) => {
    if (!context.projectId.value) return { ok: false };
    return service.addReference(context.projectId.value, payload);
  };

  const removeReference = async (resourceUuid: string) => {
    if (!context.projectId.value) return { ok: false };
    return service.removeReference(context.projectId.value, resourceUuid);
  };

  watch(
    [context.workspaceId, context.projectId],
    async ([workspaceId, projectId]) => {
      runtime.dispatch({ type: "init", workspaceId, projectId });
      if (!projectId) return;
      await service.loadResourceTypes();
      await service.loadProjectResources(projectId);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    unsubscribe();
  });

  return {
    state,
    dispatch: runtime.dispatch,
    refresh,
    addReference,
    removeReference,
    filteredResources: () => selectFilteredResources(state.value),
  };
}
