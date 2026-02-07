import type { ResourceLibraryRuntime } from "../core";
import {
  addProjectResourceReference,
  listProjectResources,
  listResourceTypes,
  removeProjectResourceReference,
} from "./resource-library-api";

export function createResourceLibraryService(runtime: ResourceLibraryRuntime) {
  const loadResourceTypes = async () => {
    const result = await listResourceTypes();
    if (result.error) {
      return {
        ok: false,
        error: "Failed to load resource types.",
      };
    }

    runtime.dispatch({
      type: "set-resource-types",
      resourceTypes: result.data?.data ?? [],
    });

    return { ok: true };
  };

  const loadProjectResources = async (projectUuid: string) => {
    runtime.dispatch({ type: "set-status", status: "loading" });
    runtime.dispatch({ type: "set-error", error: null });

    const result = await listProjectResources(projectUuid);

    if (result.error) {
      runtime.dispatch({
        type: "set-status",
        status: "error",
      });
      runtime.dispatch({
        type: "set-error",
        error: { message: "Failed to load resources." },
      });
      runtime.dispatch({ type: "set-resources", resources: [] });
      return { ok: false };
    }

    runtime.dispatch({
      type: "set-resources",
      resources: result.data?.data ?? [],
    });
    runtime.dispatch({ type: "set-status", status: "ready" });
    return { ok: true };
  };

  const addReference = async (
    projectUuid: string,
    payload: Parameters<typeof addProjectResourceReference>[1],
  ) => {
    runtime.dispatch({ type: "set-status", status: "loading" });
    runtime.dispatch({ type: "set-error", error: null });

    const result = await addProjectResourceReference(projectUuid, payload);

    if (result.error || !result.data?.data) {
      runtime.dispatch({ type: "set-status", status: "error" });
      runtime.dispatch({ type: "set-error", error: { message: "Failed to add project reference." } });
      return { ok: false };
    }

    runtime.dispatch({ type: "upsert-resource", resource: result.data.data });
    runtime.dispatch({ type: "set-status", status: "ready" });
    return { ok: true, data: result.data.data };
  };

  const removeReference = async (projectUuid: string, resourceUuid: string) => {
    runtime.dispatch({ type: "set-status", status: "loading" });
    runtime.dispatch({ type: "set-error", error: null });

    const result = await removeProjectResourceReference(projectUuid, resourceUuid);

    if (result.error) {
      runtime.dispatch({ type: "set-status", status: "error" });
      runtime.dispatch({ type: "set-error", error: { message: "Failed to remove reference." } });
      return { ok: false };
    }

    runtime.dispatch({ type: "remove-resource", resourceUuid });
    runtime.dispatch({ type: "set-status", status: "ready" });
    return { ok: true };
  };

  return {
    loadResourceTypes,
    loadProjectResources,
    addReference,
    removeReference,
  };
}
