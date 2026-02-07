import type { components } from "@/api/schema";

export type ResourceSummary = components["schemas"]["ProjectResourceReferenceRead"];
export type ResourceDetail = components["schemas"]["ResourceDetailRead"];
export type ResourceTypeSummary = components["schemas"]["ResourceTypeRead"];

export type ResourceLibraryStatus = "idle" | "loading" | "ready" | "error";

export type ResourceLibrarySortField = "updated_at" | "created_at" | "name";
export type ResourceLibrarySortDirection = "asc" | "desc";

export interface ResourceLibrarySort {
  field: ResourceLibrarySortField;
  direction: ResourceLibrarySortDirection;
}

export interface ResourceLibraryFilters {
  resourceType: string | null;
  createdBy: string | null;
  visibility: string[];
}

export interface ResourceLibrarySelection {
  resourceUuid: string | null;
}

export interface ResourceLibraryError {
  message: string;
  status?: number;
  traceId?: string;
}

export interface ResourceLibraryState {
  workspaceId: string | null;
  projectId: string | null;
  status: ResourceLibraryStatus;
  error: ResourceLibraryError | null;
  query: string;
  filters: ResourceLibraryFilters;
  sort: ResourceLibrarySort;
  resources: ResourceSummary[];
  resourceById: Record<string, ResourceSummary>;
  resourceTypes: ResourceTypeSummary[];
  selection: ResourceLibrarySelection;
  lastSyncedAt: string | null;
}

export type ResourceLibrarySelector<T> = (state: ResourceLibraryState) => T;
export type ResourceLibrarySubscriber<T> = (next: T, prev: T) => void;
