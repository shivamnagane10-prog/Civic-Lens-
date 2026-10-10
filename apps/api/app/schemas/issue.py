from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime

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

class IssueStatusUpdate(BaseModel):
    status: Literal["reported", "acknowledged", "in_progress", "resolved", "rejected"]
    comment: Optional[str] = None
    actor_id: Optional[str] = None
    actor_role: Optional[str] = "official"

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
    ai_confidence: float
    source: str
    priority_score: float
    diagnostic_card: Optional[DiagnosticCardSchema] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
