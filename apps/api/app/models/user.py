import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    role = Column(String(20), nullable=False, default="citizen")  # citizen, admin, engineer, crew
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
