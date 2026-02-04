# app/dao/resource/resource_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload, with_polymorphic
from typing import Optional, List, Dict
from app.dao.base_dao import BaseDao
from app.models.workspace import Project
from app.models.resource import Resource, ResourceInstance, ALL_INSTANCE_TYPES

# ALL_INSTANCE_TYPES = ResourceInstance.__subclasses__()
    
def build_all_polymorphic_loader() -> Dict[str, List]:
    """构建多态实例的加载器"""
    all_subclasses = ResourceInstance.__subclasses__()
    relationships = ['workspace_instance', 'latest_published_instance', 'instance_versions']
    
    # 使用嵌套列表推导式，外层是子类循环
    return {
        rel: [
            selectinload(getattr(Resource, rel).of_type(subclass))
            for subclass in all_subclasses
        ]
        for rel in relationships
    }

INSTANCE_LOADERS = build_all_polymorphic_loader()

POLYMORPHIC_LOADER = with_polymorphic(ResourceInstance, ALL_INSTANCE_TYPES, aliased=False)

class ResourceDao(BaseDao[Resource]):
    workspace_instance_loaders = INSTANCE_LOADERS['workspace_instance']
    latest_published_instance_loaders = INSTANCE_LOADERS['latest_published_instance']
    instance_versions_loaders = INSTANCE_LOADERS['instance_versions']
    
    def __init__(self, db_session: AsyncSession):
        super().__init__(Resource, db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[Resource]:
        """Finds a resource by their UUID."""
        return await self.get_one(where={"uuid": uuid}, withs=withs)

    async def get_resource_details_by_uuid(self, resource_uuid: str) -> Optional[Resource]:
        """
        使用动态构建的多态加载器，实现高性能且可维护的查询。
        """
        stmt = (
            select(Resource)
            .where(Resource.uuid == resource_uuid)
            .options(
                joinedload(Resource.project).joinedload(Project.workspace),
                joinedload(Resource.creator),
                # [关键] 使用预先构建好的、动态的加载器
                *self.workspace_instance_loaders,
                *self.latest_published_instance_loaders
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().first()

    async def get_resources_by_project_id(self, project_id: int) -> List[Resource]:
        """获取指定项目下的所有资源，并预加载必要信息以便序列化。"""
        return await self.get_list(
            where={"project_id": project_id},
            # 预加载关系以支持 ResourceRead schema
            withs=["creator", "resource_type", "workspace_instance", "latest_published_instance"],
            order=[self.model.created_at.desc()]
        )

class ResourceInstanceDao(BaseDao[ResourceInstance]):
    polymorphic_loader = POLYMORPHIC_LOADER
    def __init__(self, db_session: AsyncSession):
        super().__init__(ResourceInstance, db_session, selectable=self.polymorphic_loader)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[ResourceInstance]:
        return await self.get_one(where={"uuid": uuid}, withs=withs)

    async def get_type_by_uuid(self, instance_uuid: str) -> str:
        stmt = select(ResourceInstance.resource_type).where(ResourceInstance.uuid == instance_uuid)
        resource_type = await self.db_session.scalar(stmt)
        
        if resource_type is None:
            raise NotFoundError(f"Resource instance type not found")
            
        return resource_type

    async def get_runtime_by_uuid(self, instance_uuid: str) -> ResourceInstance:
        """
        获取运行时必要的数据
        这里必须加载 project.workspace所有者。
        """
        polymorphic_loader = self.polymorphic_loader
        stmt = (
            select(polymorphic_loader)
            .where(polymorphic_loader.uuid == instance_uuid)
            .options(
                # 这是授权所需的最小数据路径
                joinedload(polymorphic_loader.resource)
                .joinedload(Resource.project)
                .joinedload(Project.workspace)
                .options(  # 在 Workspace 级别同时加载两个关系
                    joinedload(Workspace.user_owner),
                    joinedload(Workspace.team)
                )
            )
        )
        result = await self.db.execute(stmt)
        instance = result.scalars().first()

        if not instance:
            raise NotFoundError("Resource instance not found.")
        return instance