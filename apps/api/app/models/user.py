import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    role = Column(String(20), nullable=False, default="citizen")  # citizen, admin, engineer, crew, corporator, police
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=True)
    email = Column(String(120), nullable=True, index=True)
    password_hash = Column(String(200), nullable=True)
    google_id = Column(String(100), nullable=True, index=True)
    police_badge_id = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
