# src/app/dao/resource/knowledge/knowledge_dao.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import lazyload
from typing import Optional, List
from app.dao.base_dao import BaseDao

# Import the models this DAO will interact with
from app.models.resource.knowledge import KnowledgeBase, KnowledgeDocument, KnowledgeChunk

class KnowledgeBaseDao(BaseDao[KnowledgeBase]):
    """DAO for KnowledgeBase resource instances."""
    def __init__(self, db_session: AsyncSession):
        super().__init__(model_class=KnowledgeBase, db_session=db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[KnowledgeBase]:
        """Finds a KnowledgeBase instance by its ResourceInstance UUID."""
        return await self.get_one(
            where={"uuid": uuid},
            withs=withs,
            options=[lazyload("*")]
        )

    async def get_by_uuids(self, uuids: List[str], withs: Optional[list] = None) -> Optional[List[KnowledgeBase]]:
        """Finds a KnowledgeBase instance by its ResourceInstance UUID."""
        return await self.get_list(
            where=[KnowledgeBase.uuid.in_(uuids)],
            withs=withs,
            options=[lazyload("*")],
            unique=True
        )

class KnowledgeDocumentDao(BaseDao[KnowledgeDocument]):
    """DAO for managing KnowledgeDocument records."""
    def __init__(self, db_session: AsyncSession):
        super().__init__(model_class=KnowledgeDocument, db_session=db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[KnowledgeDocument]:
        """Finds a KnowledgeDocument by its UUID."""
        return await self.get_one(where={"uuid": uuid}, withs=withs)


class KnowledgeChunkDao(BaseDao[KnowledgeChunk]):
    """DAO for managing KnowledgeChunk records."""
    def __init__(self, db_session: AsyncSession):
        super().__init__(model_class=KnowledgeChunk, db_session=db_session)

    async def get_by_uuid(self, uuid: str, withs: Optional[list] = None) -> Optional[KnowledgeChunk]:
        """Finds a KnowledgeChunk by its UUID."""
        return await self.get_one(where={"uuid": uuid}, withs=withs)

    async def get_by_vector_ids(self, vector_ids: List[str], withs: Optional[list] = None) -> List[KnowledgeChunk]:
        """
        [高效查询] Retrieves a list of KnowledgeChunk objects based on their vector_id.
        This is crucial for the "hydration" step in the search process.
        """
        if not vector_ids:
            return []
        
        # Use the 'in' operator for efficient batch fetching
        return await self.get_list(
            where=[self.model.vector_id.in_(vector_ids)],
            withs=withs
        )
