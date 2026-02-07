# src/app/dao/resource/tool/tool_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import lazyload
from typing import Optional
from app.dao.base_dao import BaseDao
from app.models.resource.tool import Tool

class ToolDao(BaseDao[Tool]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(Tool, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[Tool]:
        """Finds a Tool instance by its UUID."""
        return await self.get_one(
            where={"uuid": uuid},
            withs=withs,
            options=[lazyload("*")]
        )
