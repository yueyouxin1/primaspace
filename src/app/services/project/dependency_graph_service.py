# src/app/services/project/dependency_graph_service.py

from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

from app.core.context import AppContext
from app.dao.project.project_dao import ProjectDao
from app.dao.project.project_resource_ref_dao import ProjectResourceRefDao
from app.dao.resource.resource_ref_dao import ResourceRefDao
from app.dao.resource.resource_dao import ResourceInstanceDao
from app.dao.resource.uiapp.uiapp_dao import UiPageDao
from app.models import User
from app.models.resource import ResourceInstance, VersionStatus
from app.schemas.project.dependency_graph_schemas import (
    DependencyEdge,
    DependencyMismatch,
    DependencyNode,
    ProjectDependencyGraph,
)
from app.schemas.resource.uiapp.node import UiNode
from app.services.exceptions import NotFoundError, ServiceException
from app.services.resource.uiapp.dependency_extractor import DependencyExtractor

class ProjectDependencyGraphService:
    def __init__(self, context: AppContext):
        self.context = context
        self.db = context.db
        self.project_dao = ProjectDao(context.db)
        self.project_ref_dao = ProjectResourceRefDao(context.db)
        self.resource_ref_dao = ResourceRefDao(context.db)
        self.instance_dao = ResourceInstanceDao(context.db)
        self.ui_page_dao = UiPageDao(context.db)
        self.dependency_extractor = DependencyExtractor()

    async def build_graph(self, project_uuid: str, actor: User) -> ProjectDependencyGraph:
        project = await self.project_dao.get_by_uuid(project_uuid, withs=["workspace"])
        if not project:
            raise NotFoundError("Project not found.")

        await self.context.perm_evaluator.ensure_can(["project:read"], target=project.workspace)

        project_refs = await self.project_ref_dao.list_by_project_id(project.id)

        nodes: Dict[str, DependencyNode] = {}
        edges: List[DependencyEdge] = []
        mismatches: List[DependencyMismatch] = []

        nodes[project.uuid] = DependencyNode(
            uuid=project.uuid,
            node_type="project",
            name=project.name,
        )

        source_instances: List[ResourceInstance] = []

        for project_ref in project_refs:
            resource = project_ref.resource
            if not resource:
                continue
            instance = resource.workspace_instance or resource.latest_published_instance
            if not instance:
                continue

            self._add_instance_node(nodes, instance)
            edges.append(
                DependencyEdge(
                    source_uuid=project.uuid,
                    target_uuid=instance.uuid,
                    edge_type="project_resource_ref",
                    resource_uuid=resource.uuid,
                )
            )
            source_instances.append(instance)

        hard_refs: Dict[str, Set[Tuple[str, str]]] = defaultdict(set)
        soft_refs: Dict[str, Set[Tuple[str, str]]] = defaultdict(set)

        for instance in source_instances:
            instance_uuid = instance.uuid
            for ref in await self.resource_ref_dao.list_by_source_instance_id(instance.id):
                if not ref.target_instance:
                    continue
                target_uuid = ref.target_instance.uuid
                source_node_uuid = self._normalize_node_uuid(ref.source_node_uuid)
                hard_refs[instance_uuid].add((target_uuid, source_node_uuid))
                edges.append(
                    DependencyEdge(
                        source_uuid=instance_uuid,
                        target_uuid=target_uuid,
                        edge_type="resource_ref",
                        source_node_uuid=source_node_uuid or None,
                    )
                )
                self._add_instance_node(nodes, ref.target_instance)

            for target_uuid, source_node_uuid in await self._extract_soft_refs(instance):
                normalized_node_uuid = self._normalize_node_uuid(source_node_uuid)
                soft_refs[instance_uuid].add((target_uuid, normalized_node_uuid))
                edges.append(
                    DependencyEdge(
                        source_uuid=instance_uuid,
                        target_uuid=target_uuid,
                        edge_type="soft_ref",
                        source_node_uuid=normalized_node_uuid or None,
                    )
                )
                await self._add_instance_node_by_uuid(nodes, target_uuid)

        for source_uuid in set(hard_refs.keys()) | set(soft_refs.keys()):
            missing_hard = soft_refs[source_uuid] - hard_refs[source_uuid]
            missing_soft = hard_refs[source_uuid] - soft_refs[source_uuid]

            for target_uuid, source_node_uuid in missing_hard:
                mismatches.append(
                    DependencyMismatch(
                        source_uuid=source_uuid,
                        target_uuid=target_uuid,
                        source_node_uuid=source_node_uuid or None,
                        missing_in="hard_ref",
                    )
                )

            for target_uuid, source_node_uuid in missing_soft:
                mismatches.append(
                    DependencyMismatch(
                        source_uuid=source_uuid,
                        target_uuid=target_uuid,
                        source_node_uuid=source_node_uuid or None,
                        missing_in="soft_ref",
                    )
                )

        return ProjectDependencyGraph(
            project_uuid=project.uuid,
            nodes=list(nodes.values()),
            edges=edges,
            mismatches=mismatches,
        )

    def _normalize_node_uuid(self, source_node_uuid: Optional[str]) -> str:
        return source_node_uuid or ""

    def _add_instance_node(self, nodes: Dict[str, DependencyNode], instance: ResourceInstance) -> None:
        if instance.uuid in nodes:
            return

        resource = instance.resource
        nodes[instance.uuid] = DependencyNode(
            uuid=instance.uuid,
            node_type="instance",
            name=resource.name if resource else instance.name,
            resource_uuid=resource.uuid if resource else None,
            resource_type=resource.resource_type.name if resource and resource.resource_type else instance.resource_type,
            instance_status=instance.status.value if isinstance(instance.status, VersionStatus) else str(instance.status),
        )

    async def _add_instance_node_by_uuid(self, nodes: Dict[str, DependencyNode], instance_uuid: str) -> None:
        if instance_uuid in nodes:
            return
        instance = await self.instance_dao.get_by_uuid(instance_uuid, withs=["resource"])
        if instance:
            self._add_instance_node(nodes, instance)
            return
        nodes[instance_uuid] = DependencyNode(
            uuid=instance_uuid,
            node_type="unknown",
        )

    async def _extract_soft_refs(self, instance: ResourceInstance) -> Set[Tuple[str, Optional[str]]]:
        if instance.resource_type == "workflow":
            return self._extract_workflow_soft_refs(instance.graph or {})
        if instance.resource_type == "uiapp":
            return await self._extract_uiapp_soft_refs(instance)
        return set()

    def _extract_workflow_soft_refs(self, graph: Dict) -> Set[Tuple[str, Optional[str]]]:
        refs: Set[Tuple[str, Optional[str]]] = set()

        def walk_nodes(nodes: List[Dict]) -> None:
            for node in nodes:
                if not isinstance(node, dict):
                    continue
                node_id = node.get("id")
                data = node.get("data", {}) or {}
                config = data.get("config", {}) or {}
                if isinstance(config, dict):
                    target_uuid = config.get("resource_instance_uuid") or config.get("resourceInstanceUuid")
                    if target_uuid:
                        refs.add((target_uuid, node_id))
                blocks = data.get("blocks")
                if isinstance(blocks, list):
                    walk_nodes(blocks)

        nodes = graph.get("nodes") or []
        if isinstance(nodes, list):
            walk_nodes(nodes)
        return refs

    async def _extract_uiapp_soft_refs(self, instance: ResourceInstance) -> Set[Tuple[str, Optional[str]]]:
        pages = await self.ui_page_dao.get_list(where={"app_version_id": instance.version_id})
        refs: Set[Tuple[str, Optional[str]]] = set()

        for page in pages:
            try:
                nodes = [UiNode.model_validate(n) for n in page.data]
                for ref in self.dependency_extractor.extract_from_nodes(nodes):
                    refs.add((ref.target_instance_uuid, ref.source_node_uuid))
            except Exception as exc:
                raise ServiceException(f"Failed to parse UiApp DSL for page {page.page_uuid}: {exc}") from exc

        return refs
