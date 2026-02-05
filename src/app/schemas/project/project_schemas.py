# app/schemas/project/project_schemas.py

from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Any, Optional
from datetime import datetime
from app.models.workspace import Project, ProjectVisibility, ProjectStatus
# 复用 UserRead 来展示创建者信息，但只选择需要的字段
from app.schemas.identity.user_schemas import UserRead

class CreatorInfo(BaseModel):
    """用于在响应中展示创建者的摘要信息。"""
    uuid: str
    nick_name: Optional[str] = None
    avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    avatar: Optional[str] = Field(None, max_length=512, description="项目图标URL")
    visibility: ProjectVisibility = Field(ProjectVisibility.PRIVATE, description="项目可见性")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass

class ProjectRead(BaseModel):
    # 1. 定义我们最终想要的字段和类型
    uuid: str
    name: str
    description: Optional[str] = None
    avatar: Optional[str] = None
    status: str
    visibility: str
    creator: CreatorInfo
    created_at: datetime
    updated_at: datetime

    # 2. 配置 from_attributes=True
    model_config = ConfigDict(from_attributes=True)
    
    # 3. 使用 model_validator 来处理复杂的转换
    @model_validator(mode='before')
    @classmethod
    def pre_process_orm_obj(cls, data: Any) -> Any:
        if not isinstance(data, Project):
            return data
        return {
            "uuid": data.uuid,
            "name": data.name,
            "description": data.description,
            "avatar": data.avatar,
            "status": data.status.value if isinstance(data.status, ProjectStatus) else data.status,
            "visibility": data.visibility.value if isinstance(data.visibility, ProjectVisibility) else data.visibility,
            "creator": CreatorInfo.model_validate(data.creator) if data.creator else None,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
        }