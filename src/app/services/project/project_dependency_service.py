# src/app/services/project/project_dependency_service.py

from typing import Dict, List
from sqlalchemy import select
from app.core.context import AppContext
from app.models import User
from app.models.resource import Resource, ResourceInstance
from app.dao.project.project_dao import ProjectDao
from app.dao.project.project_resource_ref_dao import ProjectResourceRefDao
from app.schemas.project.project_dependency_schemas import (
    ProjectDependencyGraphRead,
    ProjectDependencyNodeRead,
    ProjectDependencyEdgeRead,
)
from app.services.exceptions import NotFoundError
from app.services.resource.base.base_resource_service import BaseResourceService


class ProjectDependencyService(BaseResourceService):
    def __init__(self, context: AppContext):
        super().__init__(context)
        self.project_dao = ProjectDao(context.db)
        self.project_ref_dao = ProjectResourceRefDao(context.db)

    async def get_dependency_graph(self, project_uuid: str, actor: User) -> ProjectDependencyGraphRead:
        graph = await self._get_dependency_graph(project_uuid, actor)
        return graph

    async def _get_dependency_graph(self, project_uuid: str, actor: User) -> ProjectDependencyGraphRead:
        project = await self.project_dao.get_by_uuid(project_uuid, withs=["workspace"])
        if not project:
            raise NotFoundError("Project not found.")

        await self.context.perm_evaluator.ensure_can(["project:read"], target=project.workspace)

        refs = await self.project_ref_dao.list_by_project_id(project.id)

        declared_resource_uuids: set[str] = set()
        declared_instances: Dict[str, ResourceInstance] = {}
        for ref in refs:
            resource = ref.resource
            if not resource or not resource.workspace_instance:
                continue
            declared_resource_uuids.add(resource.uuid)
            declared_instances[resource.workspace_instance.uuid] = resource.workspace_instance

        dependency_infos: Dict[str, List] = {}
        edges: List[ProjectDependencyEdgeRead] = []
        dependency_resource_uuids: set[str] = set()

        for instance in declared_instances.values():
            if not instance.resource:
                await self.db.refresh(instance, ["resource"])
            impl_service = await self._get_impl_service_by_instance(instance)
            deps = await impl_service.get_dependencies(instance)
            dependency_infos[instance.uuid] = deps
            for dep in deps:
                dependency_resource_uuids.add(dep.resource_uuid)
                edges.append(
                    ProjectDependencyEdgeRead(
                        source_instance_uuid=instance.uuid,
                        target_instance_uuid=dep.instance_uuid,
                        alias=dep.alias,
                    )
                )

        all_resource_uuids = declared_resource_uuids | dependency_resource_uuids
        resources_by_uuid: Dict[str, Resource] = {}
        if all_resource_uuids:
            stmt = select(Resource).where(Resource.uuid.in_(all_resource_uuids))
            result = await self.db.execute(stmt)
            resources_by_uuid = {resource.uuid: resource for resource in result.scalars().all()}

        nodes_map: Dict[str, ProjectDependencyNodeRead] = {}
        for instance in declared_instances.values():
            resource = instance.resource
            resource_uuid = resource.uuid if resource else None
            resource_type = resource.resource_type.name if resource and resource.resource_type else None
            nodes_map[instance.uuid] = ProjectDependencyNodeRead(
                resource_uuid=resource_uuid or "",
                instance_uuid=instance.uuid,
                name=resource.name if resource else None,
                resource_type=resource_type,
                declared=True,
                external=False,
            )

        for deps in dependency_infos.values():
            for dep in deps:
                node = nodes_map.get(dep.instance_uuid)
                if node:
                    continue
                dep_resource = resources_by_uuid.get(dep.resource_uuid)
                nodes_map[dep.instance_uuid] = ProjectDependencyNodeRead(
                    resource_uuid=dep.resource_uuid,
                    instance_uuid=dep.instance_uuid,
                    name=dep_resource.name if dep_resource else None,
                    resource_type=dep_resource.resource_type.name if dep_resource and dep_resource.resource_type else None,
                    declared=False,
                    external=True,
                )

        return ProjectDependencyGraphRead(
            nodes=list(nodes_map.values()),
            edges=edges,
        )
