# engine/schemas/parameter_schema.py

from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Any, Dict

# [核心] 用于定义 'value' 字段的结构
class ParameterValue(BaseModel):
    """
    实例级别的配置值，在设计时设置。
    用于覆盖 `default` 后备值，其优先级高于 `default`。
    """
    type: Literal["literal", "expr", "ref"] = Field(..., description="值的类型")
    content: Any = Field(..., description="字面量内容、表达式字符串或引用路径")

# [核心] 对应于 TypeScript 中的 SchemaBlueprint
class SchemaBlueprint(BaseModel):
    """
    仅用于描述一个纯粹的数据结构或“形状”，不包含任何上下文相关的元数据
    (如名称、标签、顺序等)。它是可重用的、独立的结构定义。
    """
    # ========================================================================
    # A. 核心字段 (与 JSON Schema 兼容)
    # ========================================================================
    type: Literal['string', 'number', 'integer', 'boolean', 'object', 'array'] = Field(..., description="参数的数据类型")
    uid: Optional[int] = Field(None, description="参数唯一ID (可选)")
    description: Optional[str] = Field(None, description="对参数的详细描述，供开发者或LLM理解")
    enum: Optional[List[Any]] = Field(None, description="参数的枚举值列表")
    default: Optional[Any] = Field(None, description="Schema级别的静态后备值（默认值）")

    # 任何 type 为 'object' 的蓝图都需要它。
    # 我们需要使用 List['ParameterSchema'] 因为对象的属性是具名的。
    properties: Optional[List['ParameterSchema']] = Field(None, description="当 type 为 'object' 时，定义其子属性")

    # --- 结构化字段 (使用前向引用来处理递归) ---
    items: Optional['SchemaBlueprint'] = Field(None, description="当 type 为 'array' 时，定义数组元素的结构蓝图")
    # [注意] 在 Pydantic 中，对于列表中的递归/前向引用，我们需要特殊处理
    # 为了与您的设计保持一致，我们将 properties 字段放在 ParameterSchema 中
    
    
# [核心] 对应于 TypeScript 中的 ParameterSchema
class ParameterSchema(SchemaBlueprint):
    """
    定义了一个参数的完整元数据。
    它融合了 JSON Schema 的核心概念和特定领域的扩展字段。
    """
    # ========================================================================
    # B. 领域特定扩展字段 (自定义)
    # ========================================================================
    name: str = Field(..., description="参数的名称，在对象类型中作为其属性键")
    required: bool = Field(False, description="是否必需")
    open: bool = Field(True, description="此参数是否对外部世界（LLM、最终用户）开放")
    role: Optional[str] = Field(None, description="参数在其上下文中扮演的功能性角色 (e.g., 'http.query')")
    label: Optional[str] = Field(None, description="在UI中展示的标签或名称")
    value: Optional[ParameterValue] = Field(None, description="实例级别的配置值")
    meta: Optional[Dict[str, Any]] = Field(None, description="用于存储非标准的、特定于实现的附加信息")

# [关键] 更新前向引用
# 在定义完所有模型后，调用 model_rebuild() 来解析字符串形式的前向引用
SchemaBlueprint.model_rebuild()
ParameterSchema.model_rebuild()