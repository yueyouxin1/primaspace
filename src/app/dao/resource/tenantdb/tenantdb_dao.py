# src/app/dao/resource/tenantdb/tenantdb_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.dao.base_dao import BaseDao
from app.models.resource.tenantdb import TenantDB, TenantTable, TenantColumn

class TenantDBDao(BaseDao[TenantDB]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(TenantDB, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[TenantDB]:
        """Finds a TenantDB instance by its UUID."""
        return await self.get_one(where={"uuid": uuid}, withs=withs)

class TenantTableDao(BaseDao[TenantTable]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(TenantTable, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[TenantTable]:
        """Finds a TenantTable by its UUID."""
        return await self.get_one(where={"uuid": uuid}, withs=withs)

class TenantColumnDao(BaseDao[TenantColumn]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(TenantColumn, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[TenantColumn]:
        """Finds a TenantColumn by its UUID."""
        return await self.get_one(where={"uuid": uuid}, withs=withs)