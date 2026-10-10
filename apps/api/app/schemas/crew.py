from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class CrewLocationUpdate(BaseModel):
    latitude: float = Field(..., json_schema_extra={"example": 37.7749})
    longitude: float = Field(..., json_schema_extra={"example": -122.4194})
    status: Optional[str] = None # available, dispatched, busy, offline

class CrewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    ward_id: str
    latitude: float
    longitude: float
    status: str
    contact_phone: Optional[str] = None

class CrewSuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    crew: CrewResponse
    distance_km: float
    estimated_eta_minutes: int
    recommended_score: float
