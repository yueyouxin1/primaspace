# src/app/dao/resource/resource_ref_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from sqlalchemy.orm import joinedload
from typing import List

from app.dao.base_dao import BaseDao
from app.models.resource import ResourceRef, ResourceInstance, Resource

class ResourceRefDao(BaseDao[ResourceRef]):
    def __init__(self, db_session: AsyncSession):
        super().__init__(ResourceRef, db_session)

    async def get_dependencies(self, source_instance_id: int, source_node_uuid: str = None) -> List[ResourceRef]:
        """
        获取指定实例的所有出站依赖（它引用了谁）。
        预加载 target_instance 及其 resource 信息。
        """
        stmt = (
            select(ResourceRef)
            .where(
                ResourceRef.source_instance_id == source_instance_id,
                ResourceRef.source_node_uuid == source_node_uuid
            )
            .options(
                joinedload(ResourceRef.target_instance).joinedload(ResourceInstance.resource),
                # 可选：如果需要知道目标是哪种类型（如Tool），可能需要多态加载，但基础resource信息通常足够
            )
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def get_dependents(self, target_instance_id: int) -> List[ResourceRef]:
        """
        获取指定实例的所有入站依赖（谁引用了它）。
        """
        stmt = (
            select(ResourceRef)
            .where(ResourceRef.target_instance_id == target_instance_id)
            .options(
                joinedload(ResourceRef.source_instance).joinedload(ResourceInstance.resource)
            )
        )
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def delete_by_source_and_target(self, source_id: int, target_id: int, source_node_uuid: str = None):
        """
        精确删除某条引用。
        """
        stmt = delete(ResourceRef).where(
            ResourceRef.source_instance_id == source_id,
            ResourceRef.target_instance_id == target_id
        )
        
        if source_node_uuid:
            stmt = stmt.where(ResourceRef.source_node_uuid == source_node_uuid)
            
        await self.db_session.execute(stmt)

    async def delete_all_for_source(self, source_instance_id: int):
        """
        清空源实例的所有依赖（通常用于全量同步前的清理，或者删除实例时）。
        """
        stmt = delete(ResourceRef).where(ResourceRef.source_instance_id == source_instance_id)
        await self.db_session.execute(stmt)