from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.schemas.issue import IssueResponse
from app.schemas.crew import CrewResponse

class WorkOrderCreate(BaseModel):
    issue_id: str
    assigned_crew_id: Optional[str] = None
    priority_score: Optional[float] = None

class WorkOrderStatusUpdate(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "in_progress"})
    assigned_crew_id: Optional[str] = None

class WorkOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    issue_id: str
    assigned_crew_id: Optional[str] = None
    priority_score: float
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    issue: Optional[IssueResponse] = None
    crew: Optional[CrewResponse] = None
