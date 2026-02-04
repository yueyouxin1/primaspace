# app/dao/project_dao/project_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import joinedload

from typing import Optional, List
from app.dao.base_dao import BaseDao
from app.models.workspace import Project

class ProjectDao(BaseDao[Project]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(Project, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[Project]:
        """Finds a project by their UUID."""
        return await self.get_one(where={"uuid": uuid}, withs=withs)

    async def get_projects_by_workspace_id(self, workspace_id: int) -> List[Project]:
        """获取指定工作空间下的所有项目，并预加载创建者信息。"""
        return await self.get_list(
            where={"workspace_id": workspace_id},
            withs=["creator"],
            order=[self.model.created_at.desc()]
        )