from sqlalchemy.ext.asyncio import AsyncSession
from app.core.trace_manager import TraceManager
from app.services.auditing.types.attributes import WorkflowNodeMeta, WorkflowNodeAttributes
from app.engine.workflow.interceptor import NodeExecutionInterceptor, NextCall
from app.engine.workflow.definitions import WorkflowNode, NodeExecutionResult
from app.engine.workflow.context import WorkflowContext, NodeState

class WorkflowTraceInterceptor(NodeExecutionInterceptor):
    def __init__(self, db: AsyncSession, user_id: int, workflow_trace_id: str):
        self.db = db
        self.user_id = user_id
        self.workflow_trace_id = workflow_trace_id

    async def intercept(
        self, 
        node: WorkflowNode, 
        context: WorkflowContext, 
        next_call: NextCall
    ) -> NodeState:
        
        # 1. 准备元数据
        node_id = node.id
        registry_id = node.data.registryId
        node_name = node.data.name
        node_config = node.data.config.model_dump(mode='json', exclude_none=True)

        trace_attrs = WorkflowNodeAttributes(
            meta=WorkflowNodeMeta(
                node_id=node_id,
                registry_id=registry_id,
                node_name=node_name,
                node_config=node_config
            )
        )

        # 2. 开启 Span (Context Manager)
        # TraceManager 自动利用 contextvars 将自己压栈
        async with TraceManager(
            db=self.db,
            operation_name=f"workflow.node.{registry_id.lower()}.{node_id}",
            user_id=self.user_id,
            # 强制关联到工作流的主 trace_id
            force_trace_id=self.workflow_trace_id, 
            attributes=trace_attrs
        ) as span:
            
            try:
                # 3. 让执行流继续 (进入洋葱模型的下一层)
                # 此时 _ctx_span_stack 包含了当前 span
                # 内部如果调用 ToolService.execute -> TraceManager，会自动识别为子 Span
                node_state: NodeState = await next_call()
                
                # 4. 执行成功：回填真实的输入输出
                # Executor 执行完后，result.input 是解析后的真实值
                if node_state.input:
                    span.set_input(node_state.input)

                # =========================================================
                # 场景 A: 流式任务 - 注册延迟更新
                # =========================================================
                if node_state.status == 'STREAMTASK':
                    # 1. 流节点运行中

                    broadcaster = context.variables.get(node.id)
                    
                    if isinstance(broadcaster, Streamable):
                        # 2. 定义延迟更新逻辑
                        # 这个函数会在 Root Flush 时（即工作流结束后）执行
                        async def update_trace_data():
                            try:
                                # 获取最终结果 (此时流肯定结束了，不会阻塞)
                                final_output = await broadcaster.get_result()
                                
                                # 更新内存中的 attributes 对象
                                span.set_output(NodeResultData(output=final_output))
                                
                                # 修改对象属性 (还未 INSERT，直接改内存对象即可)
                                # 注意：trace_obj期望attributes字典
                                span.trace_obj.attributes = span.attributes.model_dump(mode='json')
                                # 计算真实的结束时间和耗时
                                # 我们需要 Broadcaster 最好能记录一下结束时间，或者用当前时间近似
                                # 假设我们用当前时间（Flush时间）近似，或者如果 broadcaster 有元数据更好
                                real_duration = int((time.time() - span.start_time) * 1000)
                                span.trace_obj.duration_ms = real_duration
                                span.trace_obj.status = TraceStatus.PROCESSED # 最终标记为成功
                                span.trace_obj.processed_at = datetime.utcnow()
                                
                            except Exception as e:
                                span.set_error(f"Stream failed: {e}")

                        # 3. 注册钩子
                        # 注册钩子：告诉 TraceManager "别急着写库，等我把数据补全"
                        TraceManager.on_before_flush(update_trace_data)

                # =========================================================
                # 场景 B: 普通任务 - 直接设置
                # =========================================================
                else:
                    if isinstance(node_state.result, NodeResultData):
                        span.set_output(node_state.result)
                    else:
                        raise ValueError(f"Node failed: Result Not NodeResultData.")
    
                return node_state

            except Exception as e:
                # 5. 执行失败：记录错误
                span.set_error(e)
                raise e