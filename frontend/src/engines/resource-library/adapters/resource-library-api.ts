import { api } from "@/api";
import type { components } from "@/api/schema";

export type ResourceCreate = components["schemas"]["ResourceCreate"];
export type ResourceUpdate = components["schemas"]["ResourceUpdate"];
export type ResourceRead = components["schemas"]["ResourceRead"];
export type ResourceDetailRead = components["schemas"]["ResourceDetailRead"];
export type ResourceTypeRead = components["schemas"]["ResourceTypeRead"];
export type ProjectResourceReferenceCreate = components["schemas"]["ProjectResourceReferenceCreate"];
export type ProjectResourceReferenceRead = components["schemas"]["ProjectResourceReferenceRead"];

export async function listResourceTypes() {
  return api.GET("/api/v1/resource-types");
}

export async function listProjectResources(projectUuid: string) {
  return api.GET("/api/v1/projects/{project_uuid}/resources", {
    params: { path: { project_uuid: projectUuid } },
  });
}

export async function listWorkspaceResources(workspaceUuid: string) {
  return api.GET("/api/v1/workspaces/{workspace_uuid}/resources", {
    params: { path: { workspace_uuid: workspaceUuid } },
  });
}

export async function getResourceDetails(resourceUuid: string) {
  return api.GET("/api/v1/resources/{resource_uuid}", {
    params: { path: { resource_uuid: resourceUuid } },
  });
}

export async function createWorkspaceResource(workspaceUuid: string, payload: ResourceCreate) {
  return api.POST("/api/v1/workspaces/{workspace_uuid}/resources", {
    params: { path: { workspace_uuid: workspaceUuid } },
    body: payload,
  });
}

export async function addProjectResourceReference(
  projectUuid: string,
  payload: ProjectResourceReferenceCreate,
) {
  return api.POST("/api/v1/projects/{project_uuid}/resources", {
    params: { path: { project_uuid: projectUuid } },
    body: payload,
  });
}

export async function removeProjectResourceReference(projectUuid: string, resourceUuid: string) {
  return api.DELETE("/api/v1/projects/{project_uuid}/resources/{resource_uuid}", {
    params: { path: { project_uuid: projectUuid, resource_uuid: resourceUuid } },
  });
}

export async function updateResource(resourceUuid: string, payload: ResourceUpdate) {
  return api.PUT("/api/v1/resources/{resource_uuid}", {
    params: { path: { resource_uuid: resourceUuid } },
    body: payload,
  });
}

export async function deleteResource(resourceUuid: string) {
  return api.DELETE("/api/v1/resources/{resource_uuid}", {
    params: { path: { resource_uuid: resourceUuid } },
  });
}
