import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey
from app.database import Base

class CameraModel(Base):
    __tablename__ = "cctv_cameras"

    id = Column(String(36), primary_key=True, default=lambda: f"CAM-{uuid.uuid4().hex[:6].upper()}")
    name = Column(String(150), nullable=False)
    code = Column(String(50), nullable=False)
    location_name = Column(String(255), nullable=False)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    stream_url = Column(Text, nullable=False)
    stream_type = Column(String(20), default="mp4")  # hls, webrtc, mp4, demo
    status = Column(String(30), default="online")    # online, offline, incident_detected, maintenance
    capabilities = Column(Text, nullable=True)       # JSON string of CameraCapabilities
    last_ping = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolution = Column(String(20), default="1080p")
    fps = Column(Integer, default=30)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class RecordingModel(Base):
    __tablename__ = "cctv_recordings"

    id = Column(String(36), primary_key=True, default=lambda: f"REC-{uuid.uuid4().hex[:8].upper()}")
    camera_id = Column(String(36), ForeignKey("cctv_cameras.id"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, default=3600)
    video_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    file_size_mb = Column(Float, default=150.0)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class CctvDetectionModel(Base):
    __tablename__ = "cctv_detections"

    id = Column(String(36), primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    camera_id = Column(String(36), ForeignKey("cctv_cameras.id"), nullable=False, index=True)
    recording_id = Column(String(36), nullable=True)
    category = Column(String(50), nullable=False)  # civic_infrastructure, public_safety
    event_type = Column(String(60), nullable=False)  # pothole, potential_assault, etc.
    confidence = Column(Float, default=0.90)
    timestamp_offset_seconds = Column(Integer, default=0)
    incident_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    snapshot_url = Column(Text, nullable=False)
    video_url = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    observable_indicators = Column(Text, nullable=True)  # JSON list
    priority = Column(String(20), default="high")  # critical, high, medium, low
    review_status = Column(String(30), default="pending_review", index=True)  # pending_review, verified, inconclusive, false_positive
    reviewer_id = Column(String(36), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    complaint_id = Column(String(36), ForeignKey("issues.id"), nullable=True)
    incident_report_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class IncidentReportModel(Base):
    __tablename__ = "cctv_incident_reports"

    id = Column(String(36), primary_key=True, default=lambda: f"INC-{uuid.uuid4().hex[:8].upper()}")
    detection_id = Column(String(36), nullable=False, index=True)
    camera_id = Column(String(36), ForeignKey("cctv_cameras.id"), nullable=False)
    location_text = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False)
    category = Column(String(50), nullable=False)
    event_type = Column(String(60), nullable=False)
    priority = Column(String(20), default="high")
    incident_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    summary = Column(Text, nullable=False)
    observable_indicators = Column(Text, nullable=True)  # JSON list
    snapshot_url = Column(Text, nullable=False)
    video_url = Column(Text, nullable=True)
    video_timestamp_seconds = Column(Integer, default=0)
    reviewer_id = Column(String(36), nullable=False)
    reviewer_name = Column(String(100), nullable=False)
    review_decision = Column(String(30), default="verified")
    reviewer_notes = Column(Text, nullable=True)
    escalation_channel = Column(String(50), nullable=True)  # police_112, mrrt, traffic_police, fire_rescue, women_safety_1091, ambulance_108
    escalation_status = Column(String(30), default="draft")  # draft, dispatched, acknowledged, unit_en_route, on_scene, resolved
    agency_reference_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
