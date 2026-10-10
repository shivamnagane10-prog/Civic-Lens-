import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.database import Base

class StatusEventModel(Base):
    __tablename__ = "status_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    issue_id = Column(String(36), ForeignKey("issues.id"), nullable=False, index=True)
    old_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)
    actor_id = Column(String(36), nullable=True)
    actor_role = Column(String(20), nullable=True)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
