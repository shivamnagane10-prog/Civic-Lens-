from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class CctvCoverageZoneSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    camera_id: str
    name: str
    center_lat: float
    center_lng: float
    radius_meters: float
    status: str
    camera_resolution: str

class CctvCoverageSummaryResponse(BaseModel):
    registered_cameras_count: int
    estimated_coverage_area_sq_km: float
    coverage_zones: List[CctvCoverageZoneSchema]
    total_gaps_count: int
    calculation_basis: str
    disclosure: str

class CctvCoverageGapResponse(BaseModel):
    id: str
    area_name: str
    center_lat: float
    center_lng: float
    radius_meters: float
    gap_severity: str
    nearest_camera_id: Optional[str] = None
    nearest_camera_name: Optional[str] = None
    distance_to_nearest_camera_meters: float
    classification: str
    rationale: str
    recommended_camera_type: str
    priority_score: float

class SatelliteFindingResponse(BaseModel):
    id: str
    area_name: str
    latitude: float
    longitude: float
    finding_category: str
    title: str
    description: str
    observable_indicators: List[str]
    severity: str
    confidence: float
    status: str
    imagery_source: str
    acquisition_date: str
    resolution_gsd: str
    multispectral_band_indices: Optional[Dict[str, float]] = None
    snapshot_url: str
    complaint_id: Optional[str] = None
    created_at: datetime

class AnalyzeSatelliteRequest(BaseModel):
    area_name: str
    latitude: float
    longitude: float
    radius_meters: Optional[float] = 400.0
    spectral_profile: Optional[str] = "optical_multispectral_v3"

class CameraPlacementRecommendationCreate(BaseModel):
    gap_id: Optional[str] = None
    area_name: str
    proposed_latitude: float
    proposed_longitude: float
    recommended_camera_type: str = "PTZ Dome 4K"
    ward_id: Optional[str] = "WARD-DL-01"
    estimated_coverage_radius_meters: Optional[float] = 180.0
    justification: str
    submitted_by: Optional[str] = "OPERATOR-ADMIN"

class CameraPlacementRecommendationResponse(BaseModel):
    id: str
    gap_id: Optional[str] = None
    area_name: str
    proposed_latitude: float
    proposed_longitude: float
    recommended_camera_type: str
    ward_id: str
    estimated_coverage_radius_meters: float
    justification: str
    submitted_by: str
    status: str
    created_at: datetime

class PromoteFindingToComplaintRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    ward_id: Optional[str] = None
    severity: Optional[str] = "high"
