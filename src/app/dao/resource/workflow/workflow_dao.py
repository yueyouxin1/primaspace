# src/app/dao/resource/workflow/workflow_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import lazyload
from typing import Optional
from app.dao.base_dao import BaseDao
from app.models.resource.workflow import Workflow, WorkflowNodeDef

class WorkflowDao(BaseDao[Workflow]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(Workflow, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[Workflow]:
        return await self.get_one(
            where={"uuid": uuid},
            withs=withs,
            options=[lazyload("*")]
        )

class WorkflowNodeDefDao(BaseDao[WorkflowNodeDef]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(WorkflowNodeDef, db_session)
