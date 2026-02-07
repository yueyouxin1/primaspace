import type { ResourceLibraryCommand } from "./commands";
import type {
  ResourceLibraryState,
  ResourceSummary,
  ResourceTypeSummary,
} from "./types";

const defaultFilters = {
  resourceType: null,
  createdBy: null,
  visibility: [],
};

const defaultSort = {
  field: "updated_at",
  direction: "desc",
} as const;

export const initialResourceLibraryState: ResourceLibraryState = {
  workspaceId: null,
  projectId: null,
  status: "idle",
  error: null,
  query: "",
  filters: { ...defaultFilters },
  sort: { ...defaultSort },
  resources: [],
  resourceById: {},
  resourceTypes: [],
  selection: { resourceUuid: null },
  lastSyncedAt: null,
};

function getResourceUuid(resource: ResourceSummary) {
  return resource.resource_uuid;
}

function buildResourceIndex(resources: ResourceSummary[]) {
  return resources.reduce<Record<string, ResourceSummary>>((acc, resource) => {
    acc[getResourceUuid(resource)] = resource;
    return acc;
  }, {});
}

function normalizeResourceTypes(resourceTypes: ResourceTypeSummary[]) {
  return [...resourceTypes].sort((a, b) => a.label.localeCompare(b.label));
}

export function reduceResourceLibrary(
  state: ResourceLibraryState,
  command: ResourceLibraryCommand,
): ResourceLibraryState {
  switch (command.type) {
    case "init": {
      const contextChanged =
        state.workspaceId !== command.workspaceId || state.projectId !== command.projectId;
      if (!contextChanged) return state;
      return {
        ...state,
        workspaceId: command.workspaceId,
        projectId: command.projectId,
        status: "idle",
        error: null,
        query: "",
        filters: { ...defaultFilters },
        selection: { resourceUuid: null },
        resources: [],
        resourceById: {},
        lastSyncedAt: null,
      };
    }
    case "set-status":
      return { ...state, status: command.status };
    case "set-error":
      return { ...state, error: command.error };
    case "set-query":
      return { ...state, query: command.query };
    case "set-filters":
      return { ...state, filters: command.filters };
    case "set-sort":
      return { ...state, sort: command.sort };
    case "set-selection":
      return { ...state, selection: command.selection };
    case "set-resources": {
      const resourceIndex = buildResourceIndex(command.resources);
      return {
        ...state,
        resources: command.resources,
        resourceById: resourceIndex,
        lastSyncedAt: command.syncedAt ?? new Date().toISOString(),
      };
    }
    case "set-resource-types":
      return {
        ...state,
        resourceTypes: normalizeResourceTypes(command.resourceTypes),
      };
    case "upsert-resource": {
      const nextUuid = getResourceUuid(command.resource);
      const existingIndex = state.resources.findIndex(
        (resource) => getResourceUuid(resource) === nextUuid,
      );
      const nextResources = [...state.resources];
      if (existingIndex >= 0) {
        nextResources[existingIndex] = command.resource;
      } else {
        nextResources.unshift(command.resource);
      }
      return {
        ...state,
        resources: nextResources,
        resourceById: {
          ...state.resourceById,
          [nextUuid]: command.resource,
        },
      };
    }
    case "remove-resource": {
      if (!state.resourceById[command.resourceUuid]) return state;
      const { [command.resourceUuid]: _removed, ...rest } = state.resourceById;
      return {
        ...state,
        resources: state.resources.filter((resource) => getResourceUuid(resource) !== command.resourceUuid),
        resourceById: rest,
        selection:
          state.selection.resourceUuid === command.resourceUuid
            ? { resourceUuid: null }
            : state.selection,
      };
    }
    default:
      return state;
  }
}
