from pydantic import BaseModel, Field
from typing import Optional

class OTPRequest(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+15551234567"})

class OTPVerify(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+15551234567"})
    otp: str = Field(..., json_schema_extra={"example": "123456"})
    role: Optional[str] = "citizen"
    name: Optional[str] = None
    ward_id: Optional[str] = None

class OfficialLogin(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+15559876543"})
    role: str = Field(..., json_schema_extra={"example": "admin"}) # admin, engineer, crew
    name: Optional[str] = None
    password: Optional[str] = "admin123"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    phone: str
    role: str
    name: Optional[str] = None
    ward_id: Optional[str] = None
