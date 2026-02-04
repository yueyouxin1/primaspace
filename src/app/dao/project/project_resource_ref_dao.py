# src/app/dao/project/project_resource_ref_dao.py

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.dao.base_dao import BaseDao
from app.models.resource import ProjectResourceRef, Resource


class ProjectResourceRefDao(BaseDao[ProjectResourceRef]):
    def __init__(self, db_session):
        super().__init__(ProjectResourceRef, db_session)

    async def get_by_project_and_resource(self, project_id: int, resource_id: int) -> Optional[ProjectResourceRef]:
        return await self.get_one(where={"project_id": project_id, "resource_id": resource_id})

    async def list_by_project_id(self, project_id: int) -> List[ProjectResourceRef]:
        stmt = (
            select(ProjectResourceRef)
            .where(ProjectResourceRef.project_id == project_id)
            .options(
                joinedload(ProjectResourceRef.resource).joinedload(Resource.resource_type),
                joinedload(ProjectResourceRef.resource).joinedload(Resource.creator),
                joinedload(ProjectResourceRef.resource).joinedload(Resource.workspace_instance),
                joinedload(ProjectResourceRef.resource).joinedload(Resource.latest_published_instance),
            )
            .order_by(ProjectResourceRef.created_at.desc())
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().all()
