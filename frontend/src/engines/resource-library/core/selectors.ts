import type { ResourceLibraryState } from "./types";

export const selectResources = (state: ResourceLibraryState) => state.resources;
export const selectResourceTypes = (state: ResourceLibraryState) => state.resourceTypes;
export const selectSelection = (state: ResourceLibraryState) => state.selection;
export const selectStatus = (state: ResourceLibraryState) => state.status;
export const selectError = (state: ResourceLibraryState) => state.error;

const getResourceName = (resource: ResourceLibraryState["resources"][number]) =>
  resource.resource_name || "";

export const selectFilteredResources = (state: ResourceLibraryState) => {
  const query = state.query.trim().toLowerCase();
  const typeFilter = state.filters.resourceType;
  return state.resources.filter((resource) => {
    if (typeFilter && resource.resource_type !== typeFilter) return false;
    if (!query) return true;
    return getResourceName(resource).toLowerCase().includes(query);
  });
};
