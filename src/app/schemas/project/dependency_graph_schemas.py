# src/app/schemas/project/dependency_graph_schemas.py

from typing import List, Optional, Literal
from pydantic import BaseModel

class DependencyNode(BaseModel):
    uuid: str
    node_type: Literal["project", "instance", "unknown"]
    name: Optional[str] = None
    resource_uuid: Optional[str] = None
    resource_type: Optional[str] = None
    instance_status: Optional[str] = None

class DependencyEdge(BaseModel):
    source_uuid: str
    target_uuid: str
    edge_type: Literal["project_resource_ref", "resource_ref", "soft_ref"]
    source_node_uuid: Optional[str] = None
    resource_uuid: Optional[str] = None

class DependencyMismatch(BaseModel):
    source_uuid: str
    target_uuid: str
    source_node_uuid: Optional[str] = None
    missing_in: Literal["hard_ref", "soft_ref"]

class ProjectDependencyGraph(BaseModel):
    project_uuid: str
    nodes: List[DependencyNode]
    edges: List[DependencyEdge]
    mismatches: List[DependencyMismatch]
