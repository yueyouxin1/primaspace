# tests/api/v1/test_project_dependency_graph.py

import pytest
from httpx import AsyncClient
from fastapi import status
from typing import Callable

from app.models import Project, Resource, ResourceInstance
from tests.conftest import (
    UserContext,
    registered_user_with_pro,
    auth_headers_factory,
    created_project_in_personal_ws,
    created_resource_factory,
    publish_instance_factory,
)

pytestmark = pytest.mark.asyncio


def build_workflow_graph(target_instance_uuid: str) -> dict:
    return {
        "nodes": [
            {
                "id": "start",
                "data": {
                    "registryId": "Start",
                    "name": "Start",
                    "inputs": [],
                    "outputs": [],
                    "config": {},
                },
                "position": {"x": 100, "y": 200},
            },
            {
                "id": "tool-node",
                "data": {
                    "registryId": "Tool",
                    "name": "Tool",
                    "inputs": [],
                    "outputs": [],
                    "config": {
                        "resource_instance_uuid": target_instance_uuid,
                    },
                },
                "position": {"x": 300, "y": 200},
            },
            {
                "id": "end",
                "data": {
                    "registryId": "End",
                    "name": "End",
                    "inputs": [],
                    "outputs": [],
                    "config": {"returnType": "Object"},
                },
                "position": {"x": 500, "y": 200},
            },
        ],
        "edges": [
            {
                "sourceNodeID": "start",
                "targetNodeID": "tool-node",
                "sourcePortID": "0",
                "targetPortID": "0",
            },
            {
                "sourceNodeID": "tool-node",
                "targetNodeID": "end",
                "sourcePortID": "0",
                "targetPortID": "0",
            },
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }


class TestProjectDependencyGraph:
    async def test_dependency_graph_soft_and_hard_refs_consistent(
        self,
        client: AsyncClient,
        auth_headers_factory: Callable,
        registered_user_with_pro: UserContext,
        created_project_in_personal_ws: Project,
        created_resource_factory: Callable,
        publish_instance_factory: Callable,
    ):
        headers = await auth_headers_factory(registered_user_with_pro)
        workflow_resource: Resource = await created_resource_factory("workflow")
        tool_resource: Resource = await created_resource_factory("tool")

        published_tool: ResourceInstance = await publish_instance_factory(
            tool_resource.workspace_instance.uuid,
            "1.0.0",
        )

        graph_payload = {"graph": build_workflow_graph(published_tool.uuid)}
        response = await client.put(
            f"/api/v1/instances/{workflow_resource.workspace_instance.uuid}",
            json=graph_payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK

        ref_payload = {"resource_uuid": workflow_resource.uuid}
        ref_response = await client.post(
            f"/api/v1/projects/{created_project_in_personal_ws.uuid}/resources",
            json=ref_payload,
            headers=headers,
        )
        assert ref_response.status_code == status.HTTP_201_CREATED

        graph_response = await client.get(
            f"/api/v1/projects/{created_project_in_personal_ws.uuid}/dependency-graph",
            headers=headers,
        )
        assert graph_response.status_code == status.HTTP_200_OK

        data = graph_response.json()["data"]
        assert data["mismatches"] == []

        edges = data["edges"]
        assert any(
            edge["edge_type"] == "soft_ref" and edge["target_uuid"] == published_tool.uuid
            for edge in edges
        )
        assert any(
            edge["edge_type"] == "resource_ref" and edge["target_uuid"] == published_tool.uuid
            for edge in edges
        )
        assert any(
            edge["edge_type"] == "project_resource_ref"
            and edge["target_uuid"] == workflow_resource.workspace_instance.uuid
            for edge in edges
        )

    async def test_dependency_graph_detects_missing_soft_ref(
        self,
        client: AsyncClient,
        auth_headers_factory: Callable,
        registered_user_with_pro: UserContext,
        created_project_in_personal_ws: Project,
        created_resource_factory: Callable,
        publish_instance_factory: Callable,
    ):
        headers = await auth_headers_factory(registered_user_with_pro)
        workflow_resource: Resource = await created_resource_factory("workflow")
        tool_resource: Resource = await created_resource_factory("tool")

        published_tool: ResourceInstance = await publish_instance_factory(
            tool_resource.workspace_instance.uuid,
            "1.0.1",
        )

        ref_response = await client.post(
            f"/api/v1/instances/{workflow_resource.workspace_instance.uuid}/refs",
            json={
                "target_instance_uuid": published_tool.uuid,
                "source_node_uuid": "manual-node",
                "alias": "Manual Ref",
            },
            headers=headers,
        )
        assert ref_response.status_code == status.HTTP_200_OK

        ref_payload = {"resource_uuid": workflow_resource.uuid}
        project_ref_response = await client.post(
            f"/api/v1/projects/{created_project_in_personal_ws.uuid}/resources",
            json=ref_payload,
            headers=headers,
        )
        assert project_ref_response.status_code == status.HTTP_201_CREATED

        graph_response = await client.get(
            f"/api/v1/projects/{created_project_in_personal_ws.uuid}/dependency-graph",
            headers=headers,
        )
        assert graph_response.status_code == status.HTTP_200_OK

        data = graph_response.json()["data"]
        assert any(
            mismatch["missing_in"] == "soft_ref" and mismatch["target_uuid"] == published_tool.uuid
            for mismatch in data["mismatches"]
        )
