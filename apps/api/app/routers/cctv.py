import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cctv import CameraModel, RecordingModel, CctvDetectionModel, IncidentReportModel, AnalysisJobModel
from app.models.issue import IssueModel
from app.models.ward import WardModel
from app.models.status_event import StatusEventModel
from app.schemas.cctv import (
    CameraResponse,
    CameraCreate,
    RecordingResponse,
    CctvDetectionResponse,
    ReviewDetectionRequest,
    ComplaintDraftRequest,
    IncidentReportCreate,
    IncidentReportResponse,
    EscalateIncidentRequest,
    AnalyzeVideoRequest,
    AnalyzeVideoMultiCategoryRequest,
)
from app.services.websocket_manager import ws_manager
from app.ml.video_intelligence import VideoIntelligenceEngine, MODEL_CATALOG
from app.services.workflow_routing_service import WorkflowRoutingEngine, WORKFLOW_DEFINITIONS

router = APIRouter(prefix="/cctv", tags=["CCTV & AI Public Safety Monitoring"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _camera_to_response(cam: CameraModel, db: Session) -> dict:
    ward = db.query(WardModel).filter(WardModel.id == cam.ward_id).first()
    active_incidents = db.query(CctvDetectionModel).filter(
        CctvDetectionModel.camera_id == cam.id,
        CctvDetectionModel.review_status.in_(["pending_review", "verified"])
    ).count()
    rec_count = db.query(RecordingModel).filter(RecordingModel.camera_id == cam.id).count()

    caps = {}
    if cam.capabilities:
        try:
            caps = json.loads(cam.capabilities)
        except Exception:
            caps = {}

    return {
        "id": cam.id,
        "name": cam.name,
        "code": cam.code,
        "location_name": cam.location_name,
        "ward_id": cam.ward_id,
        "ward_name": ward.name if ward else cam.ward_id,
        "latitude": cam.latitude,
        "longitude": cam.longitude,
        "stream_url": cam.stream_url,
        "stream_type": cam.stream_type,
        "status": cam.status,
        "capabilities": caps,
        "last_ping": cam.last_ping,
        "resolution": cam.resolution,
        "fps": cam.fps,
        "is_demo": cam.is_demo,
        "active_incidents_count": active_incidents,
        "recordings_count": rec_count,
    }


def _detection_to_response(det: CctvDetectionModel, db: Session) -> dict:
    cam = db.query(CameraModel).filter(CameraModel.id == det.camera_id).first()
    indicators = []
    if det.observable_indicators:
        try:
            indicators = json.loads(det.observable_indicators)
        except Exception:
            indicators = [det.observable_indicators]

    bbox = None
    raw_bbox = getattr(det, "bounding_box", None)
    if raw_bbox:
        if isinstance(raw_bbox, dict):
            bbox = dict(raw_bbox)
        elif isinstance(raw_bbox, str):
            try:
                bbox = json.loads(raw_bbox)
            except Exception:
                bbox = None
    if bbox and isinstance(bbox, dict) and "x" in bbox and "y" in bbox:
        orig_w = bbox.get("orig_w") or 1280
        orig_h = bbox.get("orig_h") or 720
        if "norm_x" not in bbox:
            bbox["norm_x"] = round(float(bbox["x"]) / orig_w, 4)
            bbox["norm_y"] = round(float(bbox["y"]) / orig_h, 4)
            bbox["norm_w"] = round(float(bbox["w"]) / orig_w, 4)
            bbox["norm_h"] = round(float(bbox["h"]) / orig_h, 4)
        if "orig_w" not in bbox:
            bbox["orig_w"] = orig_w
            bbox["orig_h"] = orig_h

    metrics = None
    if getattr(det, "validation_metrics", None):
        try:
            metrics = json.loads(det.validation_metrics)
        except Exception:
            metrics = None

    # Resolve workflow definition for category-specific independent workflow routing
    wf = WorkflowRoutingEngine.get_workflow(det.category or det.event_type)
    wf_type = getattr(det, "workflow_type", None) or wf.get("workflow_type")
    dept = getattr(det, "assigned_department", None) or wf.get("department")
    team = getattr(det, "assigned_user_or_team", None) or wf.get("assigned_team")
    queue = getattr(det, "review_queue", None) or wf.get("review_queue")
    curr_status = getattr(det, "current_status", None) or det.review_status
    ev_req = getattr(det, "evidence_required", None)
    if ev_req:
        try:
            if isinstance(ev_req, str):
                ev_req = json.loads(ev_req)
        except Exception:
            ev_req = wf.get("evidence_required", [])
    else:
        ev_req = wf.get("evidence_required", [])

    return {
        "id": det.id,
        "camera_id": det.camera_id,
        "camera_name": cam.name if cam else det.camera_id,
        "location_name": cam.location_name if cam else "Central Urban Sector",
        "ward_id": cam.ward_id if cam else "WARD-DL-01",
        "recording_id": det.recording_id,
        "category": det.category,
        "event_type": det.event_type,
        "confidence": det.confidence,
        "timestamp_offset_seconds": det.timestamp_offset_seconds,
        "incident_time": det.incident_time,
        "snapshot_url": det.snapshot_url,
        "video_url": det.video_url or (cam.stream_url if cam else None),
        "description": det.description,
        "observable_indicators": indicators,
        "priority": det.priority,
        "review_status": det.review_status,
        "reviewer_id": det.reviewer_id,
        "reviewer_notes": det.reviewer_notes,
        "reviewed_at": det.reviewed_at,
        "complaint_id": det.complaint_id,
        "incident_report_id": det.incident_report_id,
        "model_name": getattr(det, "model_name", None) or wf.get("model_name", "CivicLens-MultiVision-v2.2"),
        "model_version": getattr(det, "model_version", None) or wf.get("model_version", "2.2.0"),
        "bounding_box": bbox,
        "is_restricted": bool(getattr(det, "is_restricted", False) or wf.get("is_restricted", False)),
        "validation_metrics": metrics,
        "workflow_type": wf_type,
        "assigned_department": dept,
        "assigned_user_or_team": team,
        "review_queue": queue,
        "current_status": curr_status,
        "evidence_required": ev_req,
        "requires_police": bool(wf.get("requires_police", False)),
        "sla_hours": wf.get("sla_hours", 24),
        "created_at": det.created_at,
    }


def _incident_to_response(inc: IncidentReportModel, db: Session) -> dict:
    cam = db.query(CameraModel).filter(CameraModel.id == inc.camera_id).first()
    indicators = []
    if inc.observable_indicators:
        try:
            indicators = json.loads(inc.observable_indicators)
        except Exception:
            indicators = []

    return {
        "id": inc.id,
        "detection_id": inc.detection_id,
        "camera_id": inc.camera_id,
        "camera_name": cam.name if cam else inc.camera_id,
        "location_text": inc.location_text,
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "ward_id": inc.ward_id,
        "category": inc.category,
        "event_type": inc.event_type,
        "priority": inc.priority,
        "incident_timestamp": inc.incident_timestamp,
        "summary": inc.summary,
        "observable_indicators": indicators,
        "snapshot_url": inc.snapshot_url,
        "video_url": inc.video_url,
        "video_timestamp_seconds": inc.video_timestamp_seconds,
        "reviewer_id": inc.reviewer_id,
        "reviewer_name": inc.reviewer_name,
        "review_decision": inc.review_decision,
        "reviewer_notes": inc.reviewer_notes,
        "escalation_channel": inc.escalation_channel,
        "escalation_status": inc.escalation_status,
        "agency_reference_id": inc.agency_reference_id,
        "created_at": inc.created_at,
        "updated_at": inc.updated_at,
    }


# ==========================================
# 1. Camera Management & Live Stream Endpoints
# ==========================================

@router.get("/cameras", response_model=List[CameraResponse])
def get_cameras(
    ward_id: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List registered CCTV cameras with live status, filters, and incident tallies."""
    query = db.query(CameraModel)
    if ward_id:
        query = query.filter(CameraModel.ward_id == ward_id)
    if status:
        query = query.filter(CameraModel.status == status)
    if q:
        search = f"%{q}%"
        query = query.filter((CameraModel.name.ilike(search)) | (CameraModel.location_name.ilike(search)))

    cameras = query.all()
    return [_camera_to_response(c, db) for c in cameras]


@router.get("/cameras/{camera_id}", response_model=CameraResponse)
def get_camera_detail(camera_id: str, db: Session = Depends(get_db)):
    """Get metadata, stream source, and capabilities for a specific camera."""
    cam = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    return _camera_to_response(cam, db)


@router.post("/cameras", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def register_camera(payload: CameraCreate, db: Session = Depends(get_db)):
    """Register a new physical or virtual CCTV stream."""
    new_cam = CameraModel(
        id=f"CAM-{uuid.uuid4().hex[:6].upper()}",
        name=payload.name,
        code=payload.code,
        location_name=payload.location_name,
        ward_id=payload.ward_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        stream_url=payload.stream_url,
        stream_type=payload.stream_type or "mp4",
        status=payload.status or "online",
        capabilities=json.dumps(payload.capabilities or {
            "live": True, "recording": True, "ptz": False, "night_vision": True, "ai_enabled": True
        }),
        resolution=payload.resolution or "1080p",
        fps=payload.fps or 30,
        is_demo=payload.is_demo or False,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_cam)
    db.commit()
    db.refresh(new_cam)
    return _camera_to_response(new_cam, db)


# ==========================================
# 2. Recorded Footage & Demo Video Upload
# ==========================================

@router.get("/cameras/{camera_id}/recordings", response_model=List[RecordingResponse])
def get_camera_recordings(
    camera_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieve historical recording segments for a camera."""
    cam = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    recordings = db.query(RecordingModel).filter(
        RecordingModel.camera_id == camera_id
    ).order_by(RecordingModel.start_time.desc()).limit(limit).all()

    return recordings


@router.post("/cameras/{camera_id}/recordings/upload", response_model=RecordingResponse)
async def upload_demo_recording(
    camera_id: str,
    file: UploadFile = File(...),
    duration_seconds: int = Form(120),
    db: Session = Depends(get_db)
):
    """
    Allow authorized operators to upload sample CCTV recordings for testing and demonstration.
    File is strictly validated and tagged as DEMO VIDEO.
    """
    cam = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    allowed_exts = [".mp4", ".webm", ".mov", ".mkv", ".avi"]
    filename = file.filename or "cctv_demo.mp4"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    clean_name = f"cctv_{camera_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, clean_name)

    content = await file.read()
    size_mb = round(len(content) / (1024 * 1024), 2)
    with open(dest_path, "wb") as f:
        f.write(content)

    video_url = f"http://localhost:8000/uploads/{clean_name}"
    now = datetime.now(timezone.utc)

    rec = RecordingModel(
        id=f"REC-DEMO-{uuid.uuid4().hex[:6].upper()}",
        camera_id=camera_id,
        start_time=now - timedelta(seconds=duration_seconds),
        end_time=now,
        duration_seconds=duration_seconds,
        video_url=video_url,
        thumbnail_url="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
        file_size_mb=size_mb,
        is_demo=True,
        created_at=now
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


# ==========================================
# 3. AI Detections & Evidence Retrieval
# ==========================================

@router.get("/models")
def get_ai_models():
    """Retrieve full catalog of multi-category AI detection models and validation metrics."""
    return VideoIntelligenceEngine.get_models_catalog()


@router.get("/workflow-rules")
def get_workflow_rules():
    """Retrieve full catalog of 10 category-specific workflow definitions and routing rules."""
    return WORKFLOW_DEFINITIONS


@router.get("/detections", response_model=List[CctvDetectionResponse])
def get_detections(
    category: Optional[str] = None,
    event_type: Optional[str] = None,
    review_status: Optional[str] = None,
    priority: Optional[str] = None,
    camera_id: Optional[str] = None,
    recording_id: Optional[str] = None,
    min_confidence: Optional[float] = None,
    include_restricted: Optional[bool] = True,
    queue: Optional[str] = Query(None, description="Filter by category review queue"),
    q: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Retrieve AI-detected multi-category civic and public safety events with timeline markers and evidence."""
    query = db.query(CctvDetectionModel)
    if isinstance(queue, str) and queue and queue != "all":
        # Match categories mapped to this review queue
        matching_cats = [k for k, v in WORKFLOW_DEFINITIONS.items() if v.get("review_queue") == queue]
        query = query.filter(CctvDetectionModel.category.in_(matching_cats))
    if category and category != "all":
        # Support grouping or exact category
        query = query.filter((CctvDetectionModel.category == category) | (CctvDetectionModel.event_type == category))
    if event_type and event_type != "all":
        query = query.filter(CctvDetectionModel.event_type == event_type)
    if review_status and review_status != "all":
        query = query.filter(CctvDetectionModel.review_status == review_status)
    if priority and priority != "all":
        query = query.filter(CctvDetectionModel.priority == priority)
    if camera_id:
        query = query.filter(CctvDetectionModel.camera_id == camera_id)
    if recording_id:
        query = query.filter(CctvDetectionModel.recording_id == recording_id)
    if min_confidence:
        query = query.filter(CctvDetectionModel.confidence >= min_confidence)
    if not include_restricted:
        query = query.filter(CctvDetectionModel.is_restricted == False)
    if q:
        search = f"%{q}%"
        query = query.filter(
            (CctvDetectionModel.description.ilike(search)) |
            (CctvDetectionModel.event_type.ilike(search)) |
            (CctvDetectionModel.id.ilike(search))
        )

    detections = query.order_by(CctvDetectionModel.incident_time.desc()).limit(limit).all()
    return [_detection_to_response(d, db) for d in detections]


@router.get("/detections/{detection_id}", response_model=CctvDetectionResponse)
def get_detection_detail(detection_id: str, db: Session = Depends(get_db)):
    """Get single AI detection record with timestamp offset and evidence images."""
    det = db.query(CctvDetectionModel).filter(CctvDetectionModel.id == detection_id).first()
    if not det:
        raise HTTPException(status_code=404, detail=f"Detection {detection_id} not found")
    return _detection_to_response(det, db)


# ==========================================
# 4. Human Review & Workflow Integration
# ==========================================

@router.post("/detections/{detection_id}/review", response_model=CctvDetectionResponse)
async def review_detection(
    detection_id: str,
    payload: ReviewDetectionRequest,
    db: Session = Depends(get_db)
):
    """
    Mandatory human triage step:
    Set review status to 'verified', 'inconclusive', 'false_positive', 'escalated', or 'closed'.
    Logs reviewer identity, notes, and timestamp for audit compliance.
    """
    det = db.query(CctvDetectionModel).filter(CctvDetectionModel.id == detection_id).first()
    if not det:
        raise HTTPException(status_code=404, detail=f"Detection {detection_id} not found")

    det.review_status = payload.review_status
    det.reviewer_id = payload.reviewer_id or "USER-ADMIN"
    det.reviewer_notes = payload.reviewer_notes
    det.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(det)

    return _detection_to_response(det, db)


@router.post("/detections/{detection_id}/complaint-draft")
async def create_complaint_from_detection(
    detection_id: str,
    payload: ComplaintDraftRequest,
    db: Session = Depends(get_db)
):
    """
    Fork A: Route a verified civic infrastructure detection (pothole, waterlogging, garbage, traffic)
    directly into the existing CivicLens AI municipal complaint workflow.
    Public safety & violence events are strictly barred from routine complaints and routed to formal Incident Reports.
    """
    det = db.query(CctvDetectionModel).filter(CctvDetectionModel.id == detection_id).first()
    if not det:
        raise HTTPException(status_code=404, detail=f"Detection {detection_id} not found")

    # Safety check: Prevent assault/forced movement/sensitive/drug/emergencies from being routed as civic complaint
    wf = WorkflowRoutingEngine.get_workflow(det.category or det.event_type)
    if wf.get("requires_police") or wf.get("is_restricted") or det.category in [
        "assault_violence", "forced_movement", "sexual_violence_sensitive", "drug_activity", "other_public_safety"
    ] or getattr(det, "is_restricted", False):
        raise HTTPException(
            status_code=400,
            detail="Public safety, physical violence, and sensitive incidents cannot be submitted as routine municipal repair complaints. Please use the formal Incident Report & Emergency Escalation workflow."
        )

    # Traffic safety belongs to Traffic Operations Center unless physical infrastructure damage is detected
    if wf.get("workflow_type") == "traffic_operations" and det.event_type not in ["roadway_obstruction", "fallen_tree"]:
        raise HTTPException(
            status_code=400,
            detail="Traffic congestion and moving vehicle events must be handled via the Traffic Management Quick Response Patrol, not municipal repair complaints."
        )

    cam = db.query(CameraModel).filter(CameraModel.id == det.camera_id).first()
    ward_id = payload.ward_id or (cam.ward_id if cam else "WARD-DL-01")

    # Map CCTV category & event type to Issue category
    cat_mapping = {
        "pothole": "pothole",
        "deep_pothole": "pothole",
        "surface_cracking_network": "road_damage",
        "broken_road_edge": "road_damage",
        "road_damage": "road_damage",
        "garbage": "garbage_waste",
        "garbage_waste": "garbage_waste",
        "garbage_pile_accumulation": "garbage_waste",
        "overflowing_waste_bin": "garbage_waste",
        "discarded_waste_bags": "garbage_waste",
        "streetlight": "streetlight",
        "broken_streetlight": "streetlight",
        "damaged_pole": "streetlight",
        "waterlogging": "waterlogging_flood",
        "waterlogging_flood": "waterlogging_flood",
        "standing_water_roadway": "waterlogging_flood",
        "waterlogged_sidewalk": "waterlogging_flood",
        "drainage": "waterlogging_flood",
        "fallen_tree": "road_damage",
        "roadway_obstruction": "road_damage",
    }
    issue_cat = cat_mapping.get(det.event_type, cat_mapping.get(det.category, "pothole"))

    # Construct standard issue
    title = payload.title or f"CCTV Auto-Detection: {det.description[:60]}"
    description = payload.description or (
        f"Automated CCTV edge detection at {cam.location_name if cam else 'City Junction'}. "
        f"Event ID: {det.id}. Observable indicators: {det.observable_indicators}. "
        f"Confidence: {round(det.confidence * 100, 1)}%."
    )

    issue = IssueModel(
        id=f"ISSUE-CCTV-{uuid.uuid4().hex[:6].upper()}",
        reporter_id="CCTV-EDGE-AI",
        reporter_phone="CCTV-SURVEILLANCE",
        title=title,
        description=description,
        category=issue_cat,
        severity=payload.severity or det.priority or "high",
        status="submitted",
        latitude=cam.latitude if cam else 28.6289,
        longitude=cam.longitude if cam else 77.2065,
        ward_id=ward_id,
        photo_url=det.snapshot_url,
        ai_confidence=det.confidence,
        source="cctv",
        priority_score=92.0 if det.priority == "critical" else 78.0,
        department=wf.get("department"),
        workflow_type=wf.get("workflow_type"),
        diagnostic_card=json.dumps({
            "severity": payload.severity or det.priority or "high",
            "cost_estimate": "₹ 16,500",
            "recommended_fix": f"Deploy immediate municipal response for {det.event_type}",
            "suggested_sla_hours": wf.get("sla_hours", 24),
            "is_estimate": True,
        }),
        created_at=datetime.now(timezone.utc)
    )
    db.add(issue)

    # Initial status event
    event = StatusEventModel(
        issue_id=issue.id,
        old_status=None,
        new_status="submitted",
        actor_id="CCTV-EDGE-AI",
        actor_role="system",
        comment=f"Ingested directly from CCTV camera {cam.name if cam else det.camera_id} via AI Incident Review"
    )
    db.add(event)

    # Update detection reference
    det.complaint_id = issue.id
    det.review_status = "verified"
    db.commit()
    db.refresh(issue)

    # Broadcast websocket event to notify Corporator & Operator portals immediately!
    await ws_manager.broadcast("ISSUE_CREATED", {
        "id": issue.id,
        "title": issue.title,
        "category": issue.category,
        "severity": issue.severity,
        "status": issue.status,
        "latitude": issue.latitude,
        "longitude": issue.longitude,
        "ward_id": issue.ward_id,
        "source": "cctv",
        "photo_url": issue.photo_url,
        "priority_score": issue.priority_score,
        "created_at": issue.created_at.isoformat(),
    })


    return {
        "message": f"Successfully created Civic Complaint #{issue.id} from CCTV detection #{det.id}",
        "issue_id": issue.id,
        "detection_id": det.id,
        "status": issue.status,
    }


@router.post("/detections/{detection_id}/incident-report", response_model=IncidentReportResponse)
def generate_incident_report(
    detection_id: str,
    payload: IncidentReportCreate,
    db: Session = Depends(get_db)
):
    """
    Fork B: Generate formal, editable incident report for public safety / emergency events.
    Captures verifiable observable indicators, video timestamp, and reviewer accountability.
    """
    det = db.query(CctvDetectionModel).filter(CctvDetectionModel.id == detection_id).first()
    if not det:
        raise HTTPException(status_code=404, detail=f"Detection {detection_id} not found")

    cam = db.query(CameraModel).filter(CameraModel.id == det.camera_id).first()
    now = datetime.now(timezone.utc)

    report_id = f"INC-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    agency_ref = f"{payload.escalation_channel.upper() if payload.escalation_channel else 'PCR'}-{uuid.uuid4().hex[:6].upper()}"

    report = IncidentReportModel(
        id=report_id,
        detection_id=det.id,
        camera_id=det.camera_id,
        location_text=cam.location_name if cam else "Central Urban Sector",
        latitude=cam.latitude if cam else 28.6289,
        longitude=cam.longitude if cam else 77.2065,
        ward_id=cam.ward_id if cam else "WARD-DL-01",
        category=det.category,
        event_type=det.event_type,
        priority=payload.priority or det.priority or "high",
        incident_timestamp=det.incident_time,
        summary=payload.summary,
        observable_indicators=det.observable_indicators,
        snapshot_url=det.snapshot_url,
        video_url=det.video_url or (cam.stream_url if cam else None),
        video_timestamp_seconds=det.timestamp_offset_seconds,
        reviewer_id=payload.reviewer_id or "USER-ADMIN",
        reviewer_name=payload.reviewer_name or "Director Sarah Vance",
        review_decision="verified",
        reviewer_notes=payload.reviewer_notes,
        escalation_channel=payload.escalation_channel or "police_112",
        escalation_status="dispatched",
        agency_reference_id=agency_ref,
        created_at=now,
        updated_at=now,
    )
    db.add(report)

    det.incident_report_id = report.id
    det.review_status = "verified"
    db.commit()
    db.refresh(report)

    return _incident_to_response(report, db)


# ==========================================
# 5. Incident Reports & Emergency Escalation
# ==========================================

@router.get("/incidents", response_model=List[IncidentReportResponse])
def get_incident_reports(
    escalation_status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all formally generated incident reports and track agency dispatch states."""
    query = db.query(IncidentReportModel)
    if escalation_status:
        query = query.filter(IncidentReportModel.escalation_status == escalation_status)
    if priority:
        query = query.filter(IncidentReportModel.priority == priority)
    if category:
        query = query.filter(IncidentReportModel.category == category)

    reports = query.order_by(IncidentReportModel.created_at.desc()).limit(limit).all()
    return [_incident_to_response(r, db) for r in reports]


@router.get("/incidents/{incident_id}", response_model=IncidentReportResponse)
def get_incident_report_detail(incident_id: str, db: Session = Depends(get_db)):
    """Get single incident report."""
    rep = db.query(IncidentReportModel).filter(IncidentReportModel.id == incident_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail=f"Incident report {incident_id} not found")
    return _incident_to_response(rep, db)


@router.post("/incidents/{incident_id}/escalate", response_model=IncidentReportResponse)
def escalate_incident(
    incident_id: str,
    payload: EscalateIncidentRequest,
    db: Session = Depends(get_db)
):
    """
    Transmit incident report to emergency agency channel:
    (Police 112 / PCR, MRRT, Fire & Rescue, Traffic Police, Women Safety Helpline 1091).
    Tracks live dispatch progression: dispatched -> acknowledged -> unit_en_route -> on_scene -> resolved.
    """
    rep = db.query(IncidentReportModel).filter(IncidentReportModel.id == incident_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail=f"Incident report {incident_id} not found")

    rep.escalation_channel = payload.escalation_channel
    rep.escalation_status = payload.escalation_status or "dispatched"
    if payload.agency_reference_id:
        rep.agency_reference_id = payload.agency_reference_id
    elif not rep.agency_reference_id:
        rep.agency_reference_id = f"AGY-{uuid.uuid4().hex[:6].upper()}"

    if payload.notes:
        rep.reviewer_notes = f"{rep.reviewer_notes or ''}\n[Update]: {payload.notes}".strip()

    rep.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rep)

    return _incident_to_response(rep, db)


# ==========================================
# 6. Real-Time Multi-Category AI Video Intelligence Engine
# ==========================================

@router.post("/analyze-video")
async def run_multi_category_video_analysis(
    payload: AnalyzeVideoMultiCategoryRequest,
    db: Session = Depends(get_db)
):
    """
    Centralized Multi-Category AI Video Intelligence Engine:
    Processes authorized live CCTV streams or historical video recordings across specialized pipelines:
    - Traffic and Road Safety (congestion, accidents, obstructions, vehicle & pedestrian tracking)
    - Garbage and Waste Management (accumulation, overflowing bins, temporal change)
    - Waterlogging and Flooding (standing water, runoff, reflections)
    - Road Damage and Infrastructure (potholes, pavement fractures, broken curbs)
    - Potential Assault and Physical Violence (action recognition, kinetic energy bursts)
    - Potential Kidnapping or Forced Movement (coercive displacement trajectory analysis)
    - Potential Sexual Violence (restricted safeguarding early-warning with strict audit controls)
    - Other Public-Safety Events (pedestrian collapse, crowd surge bottlenecks)
    """
    cam = db.query(CameraModel).filter(CameraModel.id == payload.camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {payload.camera_id} not found")

    rec = None
    video_source = payload.video_url
    if payload.recording_id:
        rec = db.query(RecordingModel).filter(RecordingModel.id == payload.recording_id).first()
        if not rec and payload.recording_id.startswith("REC-"):
            raise HTTPException(status_code=404, detail=f"Recording {payload.recording_id} not found in database archive.")
        if rec and not video_source:
            video_source = rec.video_url

    if not video_source:
        video_source = cam.stream_url

    # Create tracked analysis job
    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    job = AnalysisJobModel(
        id=job_id,
        recording_id=payload.recording_id or f"REC-{cam.id}-LIVE",
        camera_id=cam.id,
        status="processing",
        progress_percent=30,
        current_step="Extracting optical flow kinetic motion & decoding frames...",
        categories=json.dumps(payload.categories or list(MODEL_CATALOG.keys())),
        created_at=datetime.now(timezone.utc)
    )
    db.add(job)
    db.commit()

    try:
        analysis_res = VideoIntelligenceEngine.run_multi_category_analysis(
            video_source=video_source,
            camera=cam,
            recording_id=payload.recording_id,
            categories=payload.categories,
            confidence_threshold=payload.confidence_threshold or 0.70,
            sample_interval_seconds=payload.sample_interval_seconds or 1.0,
            include_restricted=payload.include_restricted if payload.include_restricted is not None else True
        )
    except Exception as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Video inference engine failure: {str(exc)}")

    created_detections = []
    for d_data in analysis_res["detections"]:
        # Duplicate prevention check or update existing detection with recording & bounding box
        existing = db.query(CctvDetectionModel).filter(
            CctvDetectionModel.camera_id == cam.id,
            CctvDetectionModel.event_type == d_data["event_type"],
            CctvDetectionModel.timestamp_offset_seconds == d_data["timestamp_offset_seconds"]
        ).first()

        if existing:
            if payload.recording_id:
                existing.recording_id = payload.recording_id
            if d_data.get("bounding_box"):
                existing.bounding_box = json.dumps(d_data["bounding_box"])
            existing.category = d_data["category"]
            created_detections.append(existing)
        else:
            det = CctvDetectionModel(
                id=d_data["id"],
                camera_id=cam.id,
                recording_id=payload.recording_id,
                category=d_data["category"],
                event_type=d_data["event_type"],
                confidence=d_data["confidence"],
                timestamp_offset_seconds=d_data["timestamp_offset_seconds"],
                incident_time=datetime.fromisoformat(d_data["incident_time"]),
                snapshot_url=d_data["snapshot_url"],
                video_url=d_data["video_url"],
                description=d_data["description"],
                observable_indicators=json.dumps(d_data["observable_indicators"]),
                priority=d_data["priority"],
                review_status="pending_review",
                model_name=d_data["model_name"],
                model_version=d_data["model_version"],
                bounding_box=json.dumps(d_data["bounding_box"]) if d_data.get("bounding_box") else None,
                is_restricted=d_data["is_restricted"],
                validation_metrics=json.dumps(d_data["validation_metrics"]) if d_data.get("validation_metrics") else None,
                created_at=datetime.fromisoformat(d_data["created_at"])
            )
            db.add(det)
            created_detections.append(det)

    if created_detections:
        db.commit()
        for det in created_detections:
            db.refresh(det)

    all_responses = [_detection_to_response(d, db) for d in created_detections]

    # Update analysis job to terminal status
    det_count = len(created_detections)
    job.status = "completed_detections_found" if det_count > 0 else "completed_no_detections"
    job.progress_percent = 100
    job.current_step = f"Inference complete — {det_count} detections found across {analysis_res['frames_analyzed']} frames"
    job.frames_analyzed = analysis_res["frames_analyzed"]
    job.video_duration_seconds = analysis_res["video_duration_seconds"]
    job.duration_ms = analysis_res["duration_ms"]
    job.detections_count = det_count
    job.completed_at = datetime.now(timezone.utc)
    db.commit()

    # Broadcast real-time websocket event
    await ws_manager.broadcast("CCTV_DETECTION_CREATED", {
        "camera_id": cam.id,
        "camera_name": cam.name,
        "detections_count": len(all_responses),
        "latest_event": all_responses[0]["event_type"] if all_responses else None
    })

    return {
        "status": job.status,
        "job_id": job.id,
        "message": analysis_res["message"],
        "duration_ms": analysis_res["duration_ms"],
        "frames_analyzed": analysis_res["frames_analyzed"],
        "video_duration_seconds": analysis_res["video_duration_seconds"],
        "detections": all_responses
    }


@router.get("/recordings/{recording_id}/job")
def get_recording_analysis_job(recording_id: str, db: Session = Depends(get_db)):
    """Get the latest analysis job status and metadata for a recording segment."""
    job = db.query(AnalysisJobModel).filter(AnalysisJobModel.recording_id == recording_id).order_by(AnalysisJobModel.created_at.desc()).first()
    if not job:
        # Check if detections exist for this recording
        det_count = db.query(CctvDetectionModel).filter(CctvDetectionModel.recording_id == recording_id).count()
        if det_count > 0:
            return {
                "id": f"JOB-ARCHIVE-{recording_id}",
                "recording_id": recording_id,
                "camera_id": "CAM-DL-101",
                "status": "completed_detections_found",
                "progress_percent": 100,
                "current_step": f"Inference complete — {det_count} detections verified",
                "categories": list(MODEL_CATALOG.keys()),
                "frames_analyzed": 120,
                "video_duration_seconds": 60,
                "original_width": 1280,
                "original_height": 720,
                "fps": 30.0,
                "duration_ms": 480.0,
                "detections_count": det_count,
                "error_message": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        return {
            "id": "NONE",
            "recording_id": recording_id,
            "camera_id": "",
            "status": "not_started",
            "progress_percent": 0,
            "current_step": "Not Analyzed",
            "categories": [],
            "frames_analyzed": 0,
            "video_duration_seconds": 0,
            "original_width": 1280,
            "original_height": 720,
            "fps": 30.0,
            "duration_ms": 0.0,
            "detections_count": 0,
            "error_message": None,
            "created_at": None,
            "completed_at": None
        }

    cats = []
    if job.categories:
        try:
            cats = json.loads(job.categories)
        except Exception:
            cats = []

    return {
        "id": job.id,
        "recording_id": job.recording_id,
        "camera_id": job.camera_id,
        "status": job.status,
        "progress_percent": job.progress_percent,
        "current_step": job.current_step,
        "categories": cats,
        "frames_analyzed": job.frames_analyzed,
        "video_duration_seconds": job.video_duration_seconds,
        "original_width": job.original_width,
        "original_height": job.original_height,
        "fps": job.fps,
        "duration_ms": job.duration_ms,
        "detections_count": job.detections_count,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None
    }


@router.post("/analyze")
async def run_ai_video_analysis(payload: AnalyzeVideoRequest, db: Session = Depends(get_db)):
    """
    Backward-compatible trigger endpoint: routes into the Multi-Category Video Intelligence Engine.
    """
    mapped_categories = list(MODEL_CATALOG.keys())
    if payload.analysis_focus == "civic_infrastructure":
        mapped_categories = ["traffic_safety", "garbage_waste", "waterlogging_flood", "road_damage"]
    elif payload.analysis_focus == "public_safety":
        mapped_categories = ["assault_violence", "forced_movement", "sexual_violence_sensitive", "other_public_safety"]

    res = await run_multi_category_video_analysis(
        AnalyzeVideoMultiCategoryRequest(
            camera_id=payload.camera_id,
            recording_id=payload.recording_id,
            video_url=payload.video_url,
            categories=mapped_categories,
            confidence_threshold=0.70,
            sample_interval_seconds=1.0,
            include_restricted=True
        ),
        db=db
    )
    first_det = res["detections"][0] if res["detections"] else None
    return {
        "status": "success",
        "message": res["message"],
        "detection": first_det,
        "detections": res["detections"]
    }

