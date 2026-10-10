from pydantic import BaseModel, ConfigDict
from typing import Optional, Any

class WardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    city: str
    boundary: Optional[Any] = None
    active_issues_count: Optional[int] = 0
    resolved_issues_count: Optional[int] = 0

class PublicWardMetricsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ward_id: str
    ward_name: str
    city: str
    total_issues: int
    resolved_issues: int
    in_progress_issues: int
    pending_issues: int
    avg_resolution_hours: float
    backlog_count: int
