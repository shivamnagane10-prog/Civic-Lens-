import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime
from app.database import Base

class WorkflowRuleModel(Base):
    __tablename__ = "workflow_rules"

    id = Column(String(36), primary_key=True, default=lambda: f"WFR-{uuid.uuid4().hex[:8].upper()}")
    category = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    workflow_type = Column(String(50), nullable=False, index=True)  # road_maintenance, waste_management, electrical_maintenance, drainage_management, traffic_operations, public_safety_restricted, sensitive_safeguarding, public_safety_emergency
    department = Column(String(150), nullable=False)
    assigned_team = Column(String(150), nullable=False)
    review_queue = Column(String(60), nullable=False, index=True)  # road_maintenance, waste_management, electrical_maintenance, drainage_management, traffic_management, public_safety_review, sensitive_safeguarding, police_submission_tracking
    allowed_statuses = Column(Text, nullable=False)  # JSON list
    evidence_required = Column(Text, nullable=False)  # JSON list
    is_restricted = Column(Boolean, default=False)
    requires_police = Column(Boolean, default=False)
    sla_hours = Column(Integer, default=24)
    notification_channels = Column(Text, nullable=True)  # JSON list
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
