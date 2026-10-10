import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from app.database import Base

class IssueModel(Base):
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True, default=lambda: f"ISSUE-{uuid.uuid4().hex[:8].upper()}")
    reporter_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reporter_phone = Column(String(20), nullable=True)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)  # pothole, garbage, drainage, water_leak, streetlight, other
    severity = Column(String(20), nullable=False, default="medium")  # low, medium, high, critical
    status = Column(String(20), nullable=False, default="reported", index=True)  # reported, acknowledged, in_progress, resolved, rejected
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)
    photo_url = Column(Text, nullable=True)
    ai_confidence = Column(Float, default=0.0)
    source = Column(String(20), default="citizen")  # citizen, cctv, satellite, iot
    priority_score = Column(Float, default=50.0)
    diagnostic_card = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    resolved_at = Column(DateTime, nullable=True)
