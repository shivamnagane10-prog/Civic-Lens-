from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime

from typing import Optional, List, Dict, Any
from app.schemas.status_event import StatusEventResponse

class DiagnosticCardSchema(BaseModel):
    severity: str
    cost_estimate: str
    recommended_fix: str
    suggested_sla_hours: int
    is_estimate: bool = True  # Always explicitly True

class IssueCreate(BaseModel):
    reporter_id: Optional[str] = None
    reporter_phone: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: str = Field(..., json_schema_extra={"example": "pothole"})
    severity: Optional[str] = "medium"
    latitude: float = Field(..., json_schema_extra={"example": 37.7749})
    longitude: float = Field(..., json_schema_extra={"example": -122.4194})
    ward_id: Optional[str] = "WARD-01"
    photo_url: Optional[str] = None
    source: Optional[str] = "citizen"
    department: Optional[str] = None
    workflow_type: Optional[str] = None

class IssueStatusUpdate(BaseModel):
    status: str  # submitted, reported, acknowledged, assigned, in_progress, awaiting_inspection, rework_required, resolved, rejected
    comment: Optional[str] = None
    actor_id: Optional[str] = None
    actor_role: Optional[str] = "official"
    assigned_crew_id: Optional[str] = None
    approved_budget: Optional[str] = None
    after_photo_url: Optional[str] = None
    crew_notes: Optional[str] = None
    engineer_remarks: Optional[str] = None
    inspection_checklist: Optional[Dict[str, Any]] = None
    priority_score: Optional[float] = None
    severity: Optional[str] = None

class IssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reporter_id: Optional[str] = None
    reporter_phone: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: str
    severity: str
    status: str
    latitude: float
    longitude: float
    ward_id: str
    photo_url: Optional[str] = None
    after_photo_url: Optional[str] = None
    crew_notes: Optional[str] = None
    engineer_remarks: Optional[str] = None
    approved_budget: Optional[str] = None
    assigned_crew_id: Optional[str] = None
    inspection_checklist: Optional[Dict[str, Any]] = None
    ai_confidence: float
    source: str
    priority_score: float
    diagnostic_card: Optional[DiagnosticCardSchema] = None
    department: Optional[str] = None
    workflow_type: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    events: Optional[List[StatusEventResponse]] = None
