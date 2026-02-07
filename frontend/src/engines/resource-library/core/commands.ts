import type {
  ResourceLibraryError,
  ResourceLibraryFilters,
  ResourceLibrarySelection,
  ResourceLibrarySort,
  ResourceLibraryStatus,
  ResourceSummary,
  ResourceTypeSummary,
} from "./types";

export type ResourceLibraryCommand =
  | { type: "init"; workspaceId: string | null; projectId: string | null }
  | { type: "set-status"; status: ResourceLibraryStatus }
  | { type: "set-error"; error: ResourceLibraryError | null }
  | { type: "set-query"; query: string }
  | { type: "set-filters"; filters: ResourceLibraryFilters }
  | { type: "set-sort"; sort: ResourceLibrarySort }
  | { type: "set-selection"; selection: ResourceLibrarySelection }
  | { type: "set-resources"; resources: ResourceSummary[]; syncedAt?: string | null }
  | { type: "set-resource-types"; resourceTypes: ResourceTypeSummary[] }
  | { type: "upsert-resource"; resource: ResourceSummary }
  | { type: "remove-resource"; resourceUuid: string };
