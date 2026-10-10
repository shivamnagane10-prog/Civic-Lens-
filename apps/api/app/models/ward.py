from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from app.database import Base

class WardModel(Base):
    __tablename__ = "wards"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False, default="Metro City")
    # Store GeoJSON boundary coordinates as JSON string
    boundary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
