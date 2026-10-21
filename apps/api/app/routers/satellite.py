import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cctv import CameraModel
from app.models.issue import IssueModel
from app.models.status_event import StatusEventModel
from app.schemas.satellite import (
    CctvCoverageSummaryResponse,
    CctvCoverageZoneSchema,
    CctvCoverageGapResponse,
    SatelliteFindingResponse,
    AnalyzeSatelliteRequest,
    CameraPlacementRecommendationCreate,
    CameraPlacementRecommendationResponse,
    PromoteFindingToComplaintRequest
)
from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["Satellite Multispectral & CCTV Coverage Monitoring"])

# In-memory storage for placement recommendations & simulated satellite findings
PLACEMENT_RECOMMENDATIONS = []

INITIAL_SATELLITE_FINDINGS = [
    {
        "id": "SAT-FIND-001",
        "area_name": "Outer Ring Road - Shivaji Transit Underpass",
        "latitude": 28.6315,
        "longitude": 77.2140,
        "finding_category": "subsidence",
        "title": "Asphalt Subsidence & Soil Depletion",
        "description": "Multispectral optical change detection indicates localized surface depression (>8cm) and sub-base moisture accumulation along the northern underpass boundary.",
        "observable_indicators": [
            "Spectral NDVI/NDWI anomaly gradient +34%",
            "Differential elevation displacement detected across 2 passes",
            "Zero registered CCTV cameras within 380m radius"
        ],
        "severity": "critical",
        "confidence": 0.89,
        "status": "needs_verification",
        "imagery_source": "Sentinel-2 MSI / Optical Orbit 42B",
        "acquisition_date": "2026-10-18T05:42:00Z",
        "resolution_gsd": "0.5m/px GSD Multispectral",
        "multispectral_band_indices": {
            "ndwi_moisture_index": 0.42,
            "surface_roughness": 0.78,
            "albedo_variance": -0.15
        },
        "snapshot_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80",
        "complaint_id": None,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": "SAT-FIND-002",
        "area_name": "Tolstoy Marg - Eastern Radial Sector",
        "latitude": 28.6250,
        "longitude": 77.2215,
        "finding_category": "flooding",
        "title": "Persistent Waterlogging & Runoff Inundation",
        "description": "Satellite optical reflection identifies surface water accumulation (>120 sq. meters) on primary arterial intersection following high-intensity rainfall.",
        "observable_indicators": [
            "Surface water reflectance index (MNDWI) > 0.65",
            "Obstructed stormwater culvert visible at 0.5m GSD",
            "Vehicular lane reduction observed from optical pass"
        ],
        "severity": "high",
        "confidence": 0.93,
        "status": "needs_verification",
        "imagery_source": "WorldView-3 High-Res Optical",
        "acquisition_date": "2026-10-19T08:15:00Z",
        "resolution_gsd": "0.3m/px Panchromatic / Multispectral",
        "multispectral_band_indices": {
            "ndwi_moisture_index": 0.71,
            "surface_roughness": 0.12,
            "albedo_variance": -0.38
        },
        "snapshot_url": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80",
        "complaint_id": None,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": "SAT-FIND-003",
        "area_name": "Barakhamba Service Lane Junction",
        "latitude": 28.6330,
        "longitude": 77.2270,
        "finding_category": "construction_impact",
        "title": "Unauthorized Construction Spoil & Roadway Narrowing",
        "description": "Optical multispectral divergence reveals building material displacement and heavy debris encroachment spilling 2.4m onto vehicular right-of-way.",
        "observable_indicators": [
            "Spectral signature matching uncontained aggregate/concrete spoil",
            "Pedestrian footpath completely obstructed",
            "High collision hazard for transit buses"
        ],
        "severity": "medium",
        "confidence": 0.86,
        "status": "needs_verification",
        "imagery_source": "Sentinel-2 MSI / Optical Orbit 42B",
        "acquisition_date": "2026-10-17T06:10:00Z",
        "resolution_gsd": "0.5m/px GSD Multispectral",
        "multispectral_band_indices": {
            "ndwi_moisture_index": -0.05,
            "surface_roughness": 0.88,
            "albedo_variance": 0.42
        },
        "snapshot_url": "https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=800&q=80",
        "complaint_id": None,
        "created_at": datetime.now(timezone.utc)
    }
]

SATELLITE_FINDINGS = list(INITIAL_SATELLITE_FINDINGS)

# Calculated CCTV coverage gaps (areas where camera density is 0 or range < required)
CALCULATED_COVERAGE_GAPS = [
    {
        "id": "GAP-DL-001",
        "area_name": "Shivaji Stadium Transit Underpass Corridor",
        "center_lat": 28.6318,
        "center_lng": 77.2135,
        "radius_meters": 220.0,
        "gap_severity": "critical",
        "nearest_camera_id": "CAM-DL-101",
        "nearest_camera_name": "Connaught Place Inner Circle - Radial 4",
        "distance_to_nearest_camera_meters": 385.0,
        "classification": "No Registered CCTV",
        "rationale": "High-footfall multi-modal transit pedestrian walkway completely outside line-of-sight and optical range of nearest camera (CAM-DL-101 is 385m away). Zero camera telemetry available.",
        "recommended_camera_type": "PTZ Dome 4K with Night Vision",
        "priority_score": 94.0
    },
    {
        "id": "GAP-DL-002",
        "area_name": "Tolstoy Marg Bus Terminal Outer Bay",
        "center_lat": 28.6248,
        "center_lng": 77.2220,
        "radius_meters": 180.0,
        "gap_severity": "high",
        "nearest_camera_id": "CAM-DL-102",
        "nearest_camera_name": "Janpath Market South Pedestrian Plaza",
        "distance_to_nearest_camera_meters": 415.0,
        "classification": "Blind Spot",
        "rationale": "Transit bus parking bays occluded by concrete station overpass. Optical visibility blocked from Janpath junction cameras.",
        "recommended_camera_type": "Dual-Sensor Optical/IR Fixed",
        "priority_score": 88.0
    },
    {
        "id": "GAP-DL-003",
        "area_name": "Barakhamba Service Lane Northern Sector",
        "center_lat": 28.6345,
        "center_lng": 77.2280,
        "radius_meters": 260.0,
        "gap_severity": "medium",
        "nearest_camera_id": "CAM-DL-101",
        "nearest_camera_name": "Connaught Place Inner Circle - Radial 4",
        "distance_to_nearest_camera_meters": 620.0,
        "classification": "Peripheral Sector",
        "rationale": "Under-monitored utility corridor with repeated illegal dumping and road surface degradation reports.",
        "recommended_camera_type": "Fixed High-FOV 1080p",
        "priority_score": 75.0
    },
    {
        "id": "GAP-DL-004",
        "area_name": "Minto Road Railway Overbridge Descent",
        "center_lat": 28.6390,
        "center_lng": 77.2250,
        "radius_meters": 240.0,
        "gap_severity": "high",
        "nearest_camera_id": "CAM-DL-101",
        "nearest_camera_name": "Connaught Place Inner Circle - Radial 4",
        "distance_to_nearest_camera_meters": 540.0,
        "classification": "Under-Monitored Corridor",
        "rationale": "Frequent monsoon waterlogging zone lacking automated visual surveillance. First responders must rely on delayed manual reports.",
        "recommended_camera_type": "PTZ Dome 4K with Weatherproof Enclosure",
        "priority_score": 85.0
    }
]

def _distance_meters(lat1, lon1, lat2, lon2):
    """Haversine formula approximation for short distances in meters."""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ==========================================
# 1. CCTV Coverage Summary & Zones
# ==========================================

@router.get("/cctv/coverage", response_model=CctvCoverageSummaryResponse)
def get_cctv_coverage(
    ward_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns registered camera locations, estimated approximate coverage zones,
    and citywide monitoring density.
    """
    query = db.query(CameraModel)
    if ward_id:
        query = query.filter(CameraModel.ward_id == ward_id)
    cameras = query.all()

    zones = []
    total_area_sq_m = 0.0

    for cam in cameras:
        # Standard estimated optical range is ~160m for 1080p, ~240m for 4K
        radius = 220.0 if "4K" in (cam.resolution or "") else 160.0
        zones.append(
            CctvCoverageZoneSchema(
                id=f"ZONE-{cam.id}",
                camera_id=cam.id,
                name=f"Coverage Zone: {cam.name}",
                center_lat=cam.latitude,
                center_lng=cam.longitude,
                radius_meters=radius,
                status="active" if cam.status == "online" else "impaired",
                camera_resolution=cam.resolution or "1080p"
            )
        )
        total_area_sq_m += math.pi * (radius ** 2)

    area_sq_km = round(total_area_sq_m / 1_000_000, 3)

    return CctvCoverageSummaryResponse(
        registered_cameras_count=len(cameras),
        estimated_coverage_area_sq_km=area_sq_km,
        coverage_zones=zones,
        total_gaps_count=len(CALCULATED_COVERAGE_GAPS),
        calculation_basis="Registered camera coordinates and standard optical field-of-view buffer (160m-220m radius).",
        disclosure="Satellite imagery does not determine ground camera line-of-sight directly. Calculations rely on authorized municipal camera registry and geometric distance buffers."
    )


# ==========================================
# 2. CCTV Coverage Gaps & CCTV-Free Areas
# ==========================================

@router.get("/cctv/coverage-gaps", response_model=List[CctvCoverageGapResponse])
def get_cctv_coverage_gaps(
    min_severity: Optional[str] = None
):
    """
    Returns calculated geographic areas where no registered CCTV cameras exist
    or where estimated coverage is critically insufficient.
    """
    gaps = CALCULATED_COVERAGE_GAPS
    if min_severity:
        gaps = [g for g in gaps if g["gap_severity"] == min_severity]
    return gaps


# ==========================================
# 3. Satellite Findings (Multispectral Optical)
# ==========================================

@router.get("/satellite/findings", response_model=List[SatelliteFindingResponse])
def get_satellite_findings(
    status: Optional[str] = None
):
    """
    Returns validated and potential AI findings detected from satellite imagery
    (road subsidence, flooding, construction encroachment).
    """
    findings = SATELLITE_FINDINGS
    if status:
        findings = [f for f in findings if f["status"] == status]
    return findings


@router.post("/satellite/analyze")
def trigger_satellite_analysis(
    payload: AnalyzeSatelliteRequest,
    db: Session = Depends(get_db)
):
    """
    Simulates asynchronous optical and multispectral satellite image analysis
    over designated coordinates to flag visible public infrastructure anomalies.
    """
    now = datetime.now(timezone.utc)
    new_finding_id = f"SAT-FIND-{uuid.uuid4().hex[:4].upper()}"

    finding = {
        "id": new_finding_id,
        "area_name": payload.area_name,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "finding_category": "subsidence",
        "title": f"Surface Anomaly Detected near {payload.area_name}",
        "description": f"Multispectral satellite pass over {payload.area_name} flagged anomalous reflectance and ground elevation variation within {payload.radius_meters}m radius.",
        "observable_indicators": [
            f"Optical spectral shift detected across {payload.radius_meters}m radius",
            "Surface texture roughness index +42% above seasonal baseline",
            "Zero registered CCTV cameras currently observing this location"
        ],
        "severity": "high",
        "confidence": 0.88,
        "status": "needs_verification",
        "imagery_source": "Sentinel-2 MSI / Optical Orbit 42B",
        "acquisition_date": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "resolution_gsd": "0.5m/px GSD Multispectral",
        "multispectral_band_indices": {
            "ndwi_moisture_index": 0.38,
            "surface_roughness": 0.72,
            "albedo_variance": 0.18
        },
        "snapshot_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80",
        "complaint_id": None,
        "created_at": now
    }

    SATELLITE_FINDINGS.insert(0, finding)

    return {
        "status": "success",
        "message": f"Satellite multispectral pass completed for {payload.area_name}",
        "finding": finding,
        "findings": SATELLITE_FINDINGS,
        "all_findings": SATELLITE_FINDINGS
    }


# ==========================================
# 4. Propose Camera Placement Recommendation
# ==========================================

@router.post("/cctv/placement-recommendations", response_model=CameraPlacementRecommendationResponse)
def create_placement_recommendation(
    payload: CameraPlacementRecommendationCreate
):
    """
    Submits a formal CCTV installation recommendation for an unmonitored geographic gap.
    Does NOT fabricate a citizen complaint; creates a structured planning assessment.
    """
    now = datetime.now(timezone.utc)
    rec_id = f"CAM-REC-{uuid.uuid4().hex[:6].upper()}"

    rec = {
        "id": rec_id,
        "gap_id": payload.gap_id,
        "area_name": payload.area_name,
        "proposed_latitude": payload.proposed_latitude,
        "proposed_longitude": payload.proposed_longitude,
        "recommended_camera_type": payload.recommended_camera_type,
        "ward_id": payload.ward_id or "WARD-DL-01",
        "estimated_coverage_radius_meters": payload.estimated_coverage_radius_meters or 180.0,
        "justification": payload.justification,
        "submitted_by": payload.submitted_by or "OPERATOR-ADMIN",
        "status": "under_review",
        "created_at": now
    }
    PLACEMENT_RECOMMENDATIONS.insert(0, rec)
    return rec


# ==========================================
# 5. Promote Satellite Finding to Complaint
# ==========================================

@router.post("/satellite/findings/{finding_id}/create-complaint")
async def promote_finding_to_complaint(
    finding_id: str,
    payload: PromoteFindingToComplaintRequest,
    db: Session = Depends(get_db)
):
    """
    Connects a verified satellite infrastructure finding (e.g. road subsidence, flooding)
    directly into the existing CivicLens AI municipal complaint workflow.
    Appears immediately in Corporator & Engineer portals for budget and dispatch!
    """
    target = next((f for f in SATELLITE_FINDINGS if f["id"] == finding_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Satellite finding {finding_id} not found")

    now = datetime.now(timezone.utc)
    issue_id = f"ISSUE-SAT-{uuid.uuid4().hex[:6].upper()}"

    cat_mapping = {
        "road_damage": "pothole",
        "subsidence": "road_damage",
        "flooding": "drainage",
        "construction_impact": "garbage",
        "hazard": "road_damage"
    }
    issue_category = cat_mapping.get(target["finding_category"], "road_damage")

    issue = IssueModel(
        id=issue_id,
        reporter_id="SATELLITE-MULTISPECTRAL",
        reporter_phone="SATELLITE-ORBIT-42B",
        title=payload.title or f"Satellite Ingestion: {target['title']}",
        description=payload.description or (
            f"Satellite multispectral observation at {target['area_name']}. "
            f"Source: {target['imagery_source']} ({target['resolution_gsd']}). "
            f"{target['description']} Observable indicators: {', '.join(target['observable_indicators'])}."
        ),
        category=issue_category,
        severity=payload.severity or target["severity"] or "high",
        status="submitted",
        latitude=target["latitude"],
        longitude=target["longitude"],
        ward_id=payload.ward_id or "WARD-DL-01",
        photo_url=target["snapshot_url"],
        ai_confidence=target["confidence"],
        source="satellite",
        priority_score=88.0,
        diagnostic_card=None,
        created_at=now
    )
    db.add(issue)

    # Initial Status Event
    event = StatusEventModel(
        issue_id=issue.id,
        old_status=None,
        new_status="submitted",
        actor_id="SATELLITE-MSI",
        actor_role="system",
        comment=f"Ingested from Satellite Multispectral Analysis ({target['imagery_source']})"
    )
    db.add(event)

    target["status"] = "promoted_to_complaint"
    target["complaint_id"] = issue.id

    db.commit()
    db.refresh(issue)

    # Broadcast websocket event to notify all connected portals immediately!
    await ws_manager.broadcast("ISSUE_CREATED", {
        "id": issue.id,
        "title": issue.title,
        "category": issue.category,
        "severity": issue.severity,
        "status": issue.status,
        "latitude": issue.latitude,
        "longitude": issue.longitude,
        "ward_id": issue.ward_id,
        "source": "satellite",
        "photo_url": issue.photo_url,
        "priority_score": issue.priority_score,
        "created_at": issue.created_at.isoformat(),
    })

    return {
        "message": f"Successfully promoted satellite finding #{finding_id} to Civic Complaint #{issue.id}",
        "issue_id": issue.id,
        "finding_id": finding_id,
        "status": issue.status
    }
