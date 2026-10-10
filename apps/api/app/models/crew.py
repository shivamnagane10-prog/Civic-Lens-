from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from app.database import Base

class CrewModel(Base):
    __tablename__ = "crews"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(20), default="available")  # available, dispatched, busy, offline
    contact_phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
