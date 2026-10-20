from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

class CameraCapabilitiesSchema(BaseModel):
    live: bool = True
    recording: bool = True
    ptz: bool = False
    night_vision: bool = True
    ai_enabled: bool = True

class CameraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str
    location_name: str
    ward_id: str
    ward_name: Optional[str] = None
    latitude: float
    longitude: float
    stream_url: str
    stream_type: str
    status: str
    capabilities: Optional[Dict[str, Any]] = None
    last_ping: Optional[datetime] = None
    resolution: str = "1080p"
    fps: int = 30
    is_demo: bool = False
    active_incidents_count: int = 0
    recordings_count: int = 0

class CameraCreate(BaseModel):
    name: str
    code: str
    location_name: str
    ward_id: str
    latitude: float
    longitude: float
    stream_url: str
    stream_type: Optional[str] = "mp4"
    status: Optional[str] = "online"
    capabilities: Optional[Dict[str, Any]] = None
    resolution: Optional[str] = "1080p"
    fps: Optional[int] = 30
    is_demo: Optional[bool] = False

class RecordingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    camera_id: str
    start_time: datetime
    end_time: datetime
    duration_seconds: int
    video_url: str
    thumbnail_url: Optional[str] = None
    file_size_mb: float
    is_demo: bool = False
    created_at: datetime

class CctvDetectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    camera_id: str
    camera_name: Optional[str] = None
    location_name: Optional[str] = None
    ward_id: Optional[str] = None
    recording_id: Optional[str] = None
    category: str
    event_type: str
    confidence: float
    timestamp_offset_seconds: int
    incident_time: datetime
    snapshot_url: str
    video_url: Optional[str] = None
    description: str
    observable_indicators: Optional[List[str]] = None
    priority: str
    ucf_reference_class: Optional[str] = "RoadAccidents"
    ucf_similarity_score: Optional[float] = 0.92
    baseline_deviation_sigma: Optional[str] = "+3.8σ"
    benchmark_citation: Optional[str] = "UCF-Crime CVPR 2018 (CRCV)"
    review_status: str
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    complaint_id: Optional[str] = None
    incident_report_id: Optional[str] = None
    created_at: datetime

class ReviewDetectionRequest(BaseModel):
    review_status: Literal["verified", "inconclusive", "false_positive"]
    reviewer_id: Optional[str] = "USER-ADMIN"
    reviewer_notes: Optional[str] = None

class ComplaintDraftRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    ward_id: Optional[str] = None
    severity: Optional[str] = "medium"

class IncidentReportCreate(BaseModel):
    detection_id: str
    summary: str
    priority: Optional[str] = "high"
    reviewer_id: Optional[str] = "USER-ADMIN"
    reviewer_name: Optional[str] = "Director Sarah Vance"
    escalation_channel: Optional[str] = "police_112"
    reviewer_notes: Optional[str] = None

class IncidentReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    detection_id: str
    camera_id: str
    camera_name: Optional[str] = None
    location_text: str
    latitude: float
    longitude: float
    ward_id: str
    category: str
    event_type: str
    priority: str
    incident_timestamp: datetime
    summary: str
    observable_indicators: Optional[List[str]] = None
    snapshot_url: str
    video_url: Optional[str] = None
    video_timestamp_seconds: int = 0
    reviewer_id: str
    reviewer_name: str
    review_decision: str
    reviewer_notes: Optional[str] = None
    escalation_channel: Optional[str] = None
    escalation_status: str
    agency_reference_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class EscalateIncidentRequest(BaseModel):
    escalation_channel: str
    escalation_status: Optional[str] = "dispatched"
    agency_reference_id: Optional[str] = None
    notes: Optional[str] = None

class AnalyzeVideoRequest(BaseModel):
    camera_id: str
    recording_id: Optional[str] = None
    video_url: Optional[str] = None
    analysis_focus: Optional[Literal["all", "civic_infrastructure", "public_safety"]] = "all"
