# src/app/schemas/resource/workflow/workflow_schemas.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, List, Optional
from app.schemas.resource.resource_schemas import InstanceUpdate, InstanceRead
from app.engine.workflow import (
    NodeResultData, NodeState, StreamEvent, ParameterSchema
)
from app.schemas.common import SSEvent, ExecutionRequest, ExecutionResponse

class WorkflowSchema(BaseModel):
    graph: Dict[str, Any] = Field(..., description="工作流 DSL")
    inputs_schema: List[ParameterSchema] = Field(default_factory=list)
    outputs_schema: List[ParameterSchema] = Field(default_factory=list)
    is_stream: bool = Field(default=False)

class WorkflowUpdate(WorkflowSchema, InstanceUpdate):
    # 更新时 graph 是可选的，但如果提供了 graph，服务层会重新计算 schema
    graph: Optional[Dict[str, Any]] = None
    # schema 和 is_stream 通常是计算出来的，不建议直接手动 update，除非是特殊的 override 逻辑
    # 这里我们允许更新，但 Service 层会覆盖它们
    pass

class WorkflowRead(InstanceRead, WorkflowSchema):
    model_config = ConfigDict(from_attributes=True)

class WorkflowNodeDefRead(BaseModel):
    id: int
    node_uid: str
    category: str
    label: str
    icon: Optional[str]
    description: Optional[str]
    display_order: int
    node: Dict[str, Any] # WorkflowNode 结构
    forms: List[Dict[str, Any]] # FormProperty 结构
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

class WorkflowEvent(SSEvent):
    """Workflow 运行时产生的原子事件"""
    pass

class WorkflowExecutionRequest(ExecutionRequest):
    # 继承 generic inputs
    pass

class WorkflowExecutionResponseData(NodeResultData):
    trace_id: Optional[str] = Field(None)

class WorkflowExecutionResponse(ExecutionResponse):
    data: WorkflowExecutionResponseData