# app/services/project/project_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.context import AppContext
from app.models import User, Workspace, Project
from app.dao.project.project_dao import ProjectDao
from app.dao.workspace.workspace_dao import WorkspaceDao
from app.schemas.project.project_schemas import ProjectCreate, ProjectUpdate, ProjectRead, CreatorInfo
from app.services.base_service import BaseService
from app.services.exceptions import NotFoundError

class ProjectService(BaseService):
    def __init__(self, context: AppContext):
        self.context = context
        self.db = context.db
        self.dao = ProjectDao(context.db)
        self.workspace_dao = WorkspaceDao(context.db)

    # --- Public DTO-returning "Wrapper" Method ---
    async def create_project_in_workspace(self, workspace_uuid: str, project_data: ProjectCreate, actor: User) -> ProjectRead:
        """Create a new project in the specified workspace and return as DTO"""
        project = await self._create_project_in_workspace(workspace_uuid, project_data, actor)
        return ProjectRead.model_validate(project)

    async def get_projects_in_workspace(self, workspace_uuid: str, actor: User) -> List[ProjectRead]:
        """Get all projects in the specified workspace as DTOs"""
        projects = await self._get_projects_in_workspace(workspace_uuid, actor)
        return [ProjectRead.model_validate(p) for p in projects]

    async def get_project_by_uuid(self, project_uuid: str, actor: User) -> ProjectRead:
        """Get a single project by UUID as DTO"""
        project = await self._get_project_by_uuid(project_uuid, actor)
        return ProjectRead.model_validate(project)

    async def update_project_by_uuid(self, project_uuid: str, update_data: ProjectUpdate, actor: User) -> ProjectRead:
        """Update a project and return the updated version as DTO"""
        project = await self._update_project_by_uuid(project_uuid, update_data, actor)
        return ProjectRead.model_validate(project)

    async def delete_project_by_uuid(self, project_uuid: str, actor: User) -> None:
        """Delete a project (no return value)"""
        await self._delete_project_by_uuid(project_uuid, actor)

    # --- Internal ORM-returning "Workhorse" Method ---
    async def _create_project_in_workspace(self, workspace_uuid: str, project_data: ProjectCreate, actor: User) -> Project:
        workspace = await self.workspace_dao.get_by_uuid(workspace_uuid)
        if not workspace:
            raise NotFoundError("Workspace not found.")
        
        # 权限检查: 检查actor是否对该workspace有创建项目的权限
        await self.context.perm_evaluator.ensure_can(["project:create"], target=workspace)

        new_project = Project(
            **project_data.model_dump(),
            workspace_id=workspace.id,
            creator_id=actor.id
        )

        self.db.add(new_project)
        await self.db.flush()
        final_project = await self.dao.get_one(
            where={"id": new_project.id}
        )
        return final_project

    async def _get_projects_in_workspace(self, workspace_uuid: str, actor: User) -> List[Project]:
        workspace = await self.workspace_dao.get_by_uuid(workspace_uuid)
        if not workspace:
            raise NotFoundError("Workspace not found.")

        await self.context.perm_evaluator.ensure_can(["project:read"], target=workspace)
        
        return await self.dao.get_projects_by_workspace_id(workspace.id)

    async def _get_project_by_uuid(self, project_uuid: str, actor: User) -> Project:
        # 预加载 workspace 以便权限检查
        project = await self.dao.get_by_uuid(project_uuid)
        if not project:
            raise NotFoundError("Project not found.")
            
        await self.context.perm_evaluator.ensure_can(["project:read"], target=project.workspace)
        
        return project

    async def _update_project_by_uuid(self, project_uuid: str, update_data: ProjectUpdate, actor: User) -> Project:
        project = await self.dao.get_by_uuid(project_uuid)
        if not project:
            raise NotFoundError("Project not found.")

        await self.context.perm_evaluator.ensure_can(["project:update"], target=project.workspace)
        
        for key, value in update_data.model_dump().items():
            setattr(project, key, value)
            
        await self.db.flush()
        await self.db.refresh(project)
        return project
        
    async def _delete_project_by_uuid(self, project_uuid: str, actor: User) -> None:
        project = await self.dao.get_by_uuid(project_uuid)
        if not project:
            raise NotFoundError("Project not found.")
            
        await self.context.perm_evaluator.ensure_can(["project:delete"], target=project.workspace)
        
        await self.db.delete(project)
        await self.db.flush()