from dataclasses import dataclass
from app.utils.async_generator import AsyncGeneratorManager 

@dataclass
class WorkflowRunResult:
    generator: AsyncGeneratorManager 
    trace_id: str