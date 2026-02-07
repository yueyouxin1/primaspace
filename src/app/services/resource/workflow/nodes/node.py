# src/app/services/resource/workflow/nodes/node.py

import logging
import json
import asyncio
from decimal import Decimal
from typing import Dict, Any, List, Optional

# Engine & Registry
from app.engine.workflow.registry import register_node, BaseNode
from app.engine.workflow.definitions import NodeExecutionResult, NodeResultData, StreamEvent, ParameterSchema
from app.engine.utils.parameter_schema_utils import schemas2obj
from app.engine.utils.stream import StreamBroadcaster

# Templates
from .template import LLM_TEMPLATE, TOOL_TEMPLATE, AGENT_TEMPLATE

# Services & Context
from app.core.context import AppContext
from app.core.trace_manager import TraceManager
from app.utils.async_generator import AsyncGeneratorManager
from app.services.module.service_module_service import ServiceModuleService
from app.services.billing.context import BillingContext
from app.services.product.types.feature import FeatureRole
from app.dao.resource.resource_ref_dao import ResourceRefDao
from app.schemas.resource.execution_schemas import AnyExecutionRequest

logger = logging.getLogger(__name__)

# ==============================================================================
# 1. AppLLMNode: 生产级大模型节点
# ==============================================================================

class BaseLLMNodeProcessor:
    async def _generate_text_or_markdown(
        self, 
        generator: AsyncGeneratorManager, 
        outputs_schema: List[ParameterSchema], 
        broadcaster: StreamBroadcaster=None
    ) -> Dict[str, Any]:
        final_content = ""
        if not outputs_schema or not outputs_schema[0].name:
            raise NotFoundError(f"outputs_schema not found.")
        primary_key = outputs_schema[0].name
        for value in generator:
            if value.event == 'chunk' and broadcaster:
                char = value.data.get('content')
                await broadcaster.broadcast({primary_key: char})
            elif value.event == 'finish':
                final_content = value.data.get('content')
        # 最终结果需要包含其他非主要字段的默认值(如果有)
        base_output = await schemas2obj(outputs_schema, self.context.variables)
        base_output[primary_key] = final_content
        return base_output

    async def _generate_json(
        self, 
        generator: AsyncGeneratorManager, 
        outputs_schema: List[ParameterSchema], 
        broadcaster: StreamBroadcaster=None
    ) -> Dict[str, Any]:
        # 生产环境应该开启模型原生输出格式控制（若支持）或提示词注入
        base_output = await schemas2obj(outputs_schema, self.context.variables)
        return base_output

@register_node(template=LLM_TEMPLATE)
class AppLLMNode(BaseNode, BaseLLMNodeProcessor):

    async def execute(self) -> NodeExecutionResult:
        from app.services.resource.agent.agent_service import AgentService, LLMMessage
        external_context = self.context.external_context
        app_context = external_context.app_context
        workflow_instance = external_context.workflow_instance
        runtime_workspace = external_context.runtime_workspace
        
        # 1. 解析输入参数
        node_input = await schemas2obj(self.node.data.inputs, self.context.variables)
        outputs_schema = self.node.data.outputs or []
        
        # 2. 获取配置
        config = self.node.data.config
        module_uuid = config.llm_module_version_uuid
        system_prompt = config.system_prompt
        history = config.history or []
        agent_config = config.agent_config
        use_stream = self.is_stream_producer
        response_format = getattr(agent_config.io_config, "response_format", "text") 
        llm_module_version_uuid = config.llm_module_version_uuid

        agent_service = AgentService(app_context)
        smv = await agent_service.module_service.smv_dao.get_by_uuid(llm_module_version_uuid)
        if not smv:
            raise NotFoundError(f"LLM Module Version {llm_module_version_uuid} not found.")
        # 这里可以加更多检查，比如类型是否为 LLM
        llm_module_version_id = smv.id

        dependencies = await agent_service.ref_dao.get_dependencies(source_instance_id=workflow_instance.id, source_node_uuid=self.node.id)

        messages = [
            LLMMessage(role="system", content=system_prompt),
            *history
        ]
        for message in messages:
            message.content = agent_service.prompt_template.render(message.content, node_input)
            
        generator = AsyncGeneratorManager()

        agent_task = await self.create_agent_task(
            agent_config=agent_config,
            llm_module_version_id=llm_module_version_id,
            actor=app_context.actor,
            runtime_workspace=runtime_workspace,
            dependencies=dependencies,
            messages=messages,
            generator_manager=generator,
            context_processors=None,
            session_manager=None,
            trace_manager=None
        )

        generator_func = self._generate_json if response_format == "json" else self._generate_text_or_markdown
        
        if use_stream:
            broadcaster = StreamBroadcaster(self.node.id)
            task = broadcaster.create_task(generator_func(generator, outputs_schema, broadcaster))
            return NodeExecutionResult(input=node_input, data=broadcaster)
        else:
            # 非流式直接运行并返回
            output = await generator_func(generator, outputs_schema)
            return NodeExecutionResult(input=node_input, data=NodeResultData(output=output))

# ==============================================================================
# 2. AppAgentNode: 生产级智能体节点
# ==============================================================================

@register_node(template=AGENT_TEMPLATE)
class AppAgentNode(BaseNode, BaseLLMNodeProcessor):
    async def execute(self) -> NodeExecutionResult:
        from app.services.resource.agent.agent_service import AgentService, AgentExecutionRequest, AgentExecutionInputs
        external_context = self.context.external_context
        app_context = external_context.app_context
        workflow_instance = external_context.workflow_instance
        runtime_workspace = external_context.runtime_workspace
        
        # 1. 解析输入参数
        node_input = await schemas2obj(self.node.data.inputs, self.context.variables)
        outputs_schema = self.node.data.outputs or []
        
        # 2. 获取配置
        config = self.node.data.config
        agent_instance_uuid = config.resource_instance_uuid
        if not agent_instance_uuid:
            raise ValueError("Agent Instance UUID Not Configured.")
        enable_session = config.enable_session
        if enable_session and not config.session_uuid:
            raise NotFoundError(f"Agent Session Must Provide.")
        session_uuid = config.session_uuid if enable_session else None
        history = None if enable_session else config.history
        use_stream = self.is_stream_producer

        agent_service = AgentService(app_context)
        input_query = agent_service.prompt_template.render(config.input_query, node_input)
        execute_params = AgentExecutionRequest(
            inputs=AgentExecutionInputs(
                input_query=input_query,
                session_uuid=session_uuid,
                history=history
            )
        )
        result = await agent_service.async_execute(
            instance_uuid=agent_instance_uuid,
            execute_params=execute_params,
            actor=app_context.actor,
            runtime_workspace=runtime_workspace
        )

        generator = result.generator
        agent_config = result.config
        response_format = getattr(agent_config.io_config, "response_format", "text") 

        generator_func = self._generate_json if response_format == "json" else self._generate_text_or_markdown
        
        if use_stream:
            broadcaster = StreamBroadcaster(self.node.id)
            task = broadcaster.create_task(generator_func(generator, outputs_schema, broadcaster))
            return NodeExecutionResult(input=node_input, data=broadcaster)
        else:
            # 非流式直接运行并返回
            output = await generator_func(generator, outputs_schema)
            return NodeExecutionResult(input=node_input, data=NodeResultData(output=output))

# ==============================================================================
# 3. AppToolNode: 生产级工具节点 (补充完整)
# ==============================================================================

@register_node(template=TOOL_TEMPLATE)
class AppToolNode(BaseNode):
    async def execute(self) -> NodeExecutionResult:
        app_context = get_app_context(self)
        
        # 1. 解析输入
        node_input = await schemas2obj(self.node.data.inputs, self.context.variables)
        
        # 2. 获取配置
        tool_uuid = self.node.data.config.resource_instance_uuid
        if not tool_uuid:
            raise ValueError("Tool UUID not configured.")

        # 3. 调用通用执行服务
        from app.services.resource.execution.execution_service import ExecutionService
        exec_service = ExecutionService(app_context)
        
        request = AnyExecutionRequest(inputs=node_input)
        
        # Execute
        # 此时 billing_entity 使用 workflow 的 owner
        result = await exec_service.execute_instance(
            instance_uuid=tool_uuid,
            execute_params=request,
            actor=app_context.actor,
            billing_entity=app_context.billing_owner 
        )
        
        if not result.success:
            raise RuntimeError(f"Tool execution failed: {result.error_message}")
            
        # Tool 的返回值通常是结构化的 JSON
        return NodeExecutionResult(input=node_input, data=NodeResultData(output=result.data))