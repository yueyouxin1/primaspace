# src/app/dao/resource/agent/agent_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import lazyload
from typing import Optional
from app.dao.base_dao import BaseDao
from app.models.resource.agent import Agent

class AgentDao(BaseDao[Agent]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(Agent, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[Agent]:
        return await self.get_one(
            where={"uuid": uuid},
            withs=withs,
            options=[lazyload("*")]
        )
