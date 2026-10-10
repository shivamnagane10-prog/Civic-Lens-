import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from app.database import Base

class WorkOrderModel(Base):
    __tablename__ = "work_orders"

    id = Column(String(36), primary_key=True, default=lambda: f"WO-{uuid.uuid4().hex[:8].upper()}")
    issue_id = Column(String(36), ForeignKey("issues.id"), nullable=False, index=True)
    assigned_crew_id = Column(String(36), ForeignKey("crews.id"), nullable=True, index=True)
    priority_score = Column(Float, default=50.0)
    status = Column(String(20), default="pending")  # pending, assigned, in_progress, completed, cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
