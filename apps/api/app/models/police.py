import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from app.database import Base

class PoliceEvidencePackageModel(Base):
    __tablename__ = "police_evidence_packages"

    id = Column(String(36), primary_key=True, default=lambda: f"EVD-{uuid.uuid4().hex[:8].upper()}")
    incident_report_id = Column(String(36), nullable=True)
    detection_id = Column(String(36), nullable=True)
    case_number = Column(String(60), nullable=False, unique=True, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    incident_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    camera_code = Column(String(50), nullable=False)
    video_clip_url = Column(Text, nullable=False)
    video_hash_sha256 = Column(String(64), nullable=False)
    snapshot_url = Column(Text, nullable=False)
    snapshot_hash_sha256 = Column(String(64), nullable=False)
    chain_of_custody_log = Column(Text, nullable=True)  # JSON list of custody records
    officer_badge_id = Column(String(50), nullable=True)
    assigned_police_dept = Column(String(100), default="Cyber Crime & Surveillance Division")
    case_status = Column(String(50), default="submitted_to_police", index=True)  # draft, submitted_to_police, acknowledged, under_investigation, charges_filed, closed
    classification_level = Column(String(50), default="Restricted")  # Restricted, Confidential, Urgent Judicial Evidence
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
