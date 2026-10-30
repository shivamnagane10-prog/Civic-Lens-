from pydantic import BaseModel, Field
from typing import Optional

class OTPRequest(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+919876543215"})

class OTPVerify(BaseModel):
    phone: str = Field(..., json_schema_extra={"example": "+919876543215"})
    otp: str = Field(..., json_schema_extra={"example": "123456"})
    role: Optional[str] = "citizen"
    name: Optional[str] = None
    ward_id: Optional[str] = "WARD-DL-01"

class GoogleAuthRequest(BaseModel):
    email: str = Field(..., json_schema_extra={"example": "citizen@gmail.com"})
    name: Optional[str] = "Aarav Mehta"
    google_id: Optional[str] = None
    picture: Optional[str] = None

class OfficialLogin(BaseModel):
    identifier: Optional[str] = Field(None, json_schema_extra={"example": "engineer@civiclens.gov.in"})
    phone: Optional[str] = Field(None, json_schema_extra={"example": "+919876543211"})
    role: str = Field(..., json_schema_extra={"example": "engineer"}) # admin, engineer, crew, corporator, police
    name: Optional[str] = None
    password: Optional[str] = "staff123"
    police_badge_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    phone: str
    role: str
    name: Optional[str] = None
    ward_id: Optional[str] = None
    email: Optional[str] = None
    police_badge_id: Optional[str] = None
    department: Optional[str] = None
