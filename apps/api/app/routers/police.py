import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.police import PoliceEvidencePackageModel
from app.models.user import UserModel
from app.services.auth_service import get_current_user_optional, require_roles

router = APIRouter(prefix="/police", tags=["Police & Public Safety Evidence"])

class CreateEvidencePackageRequest(BaseModel):
    incident_report_id: Optional[str] = None
    detection_id: Optional[str] = None
    title: str
    category: str
    location_name: str
    latitude: float
    longitude: float
    camera_code: str
    video_clip_url: str
    snapshot_url: str
    reviewer_name: Optional[str] = "Control Room Reviewer"
    reviewer_notes: Optional[str] = None
    classification_level: Optional[str] = "Restricted"
    assigned_police_dept: Optional[str] = "Cyber Crime & Video Surveillance Division"

class UpdateCaseStatusRequest(BaseModel):
    case_status: str  # acknowledged, under_investigation, charges_filed, closed
    officer_badge_id: Optional[str] = None
    officer_name: Optional[str] = None
    investigation_notes: Optional[str] = None

class AddCustodyEntryRequest(BaseModel):
    action: str
    officer_or_agent: str
    details: str

def _compute_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def _format_package(pkg: PoliceEvidencePackageModel) -> dict:
    chain = []
    if pkg.chain_of_custody_log:
        try:
            chain = json.loads(pkg.chain_of_custody_log)
        except Exception:
            chain = []
    return {
        "id": pkg.id,
        "incident_report_id": pkg.incident_report_id,
        "detection_id": pkg.detection_id,
        "case_number": pkg.case_number,
        "title": pkg.title,
        "category": pkg.category,
        "incident_timestamp": pkg.incident_timestamp.isoformat() if pkg.incident_timestamp else None,
        "location_name": pkg.location_name,
        "latitude": pkg.latitude,
        "longitude": pkg.longitude,
        "camera_code": pkg.camera_code,
        "video_clip_url": pkg.video_clip_url,
        "video_hash_sha256": pkg.video_hash_sha256,
        "snapshot_url": pkg.snapshot_url,
        "snapshot_hash_sha256": pkg.snapshot_hash_sha256,
        "chain_of_custody_log": chain,
        "officer_badge_id": pkg.officer_badge_id,
        "assigned_police_dept": pkg.assigned_police_dept,
        "case_status": pkg.case_status,
        "classification_level": pkg.classification_level,
        "created_at": pkg.created_at.isoformat() if pkg.created_at else None,
        "updated_at": pkg.updated_at.isoformat() if pkg.updated_at else None,
    }

@router.get("/evidence-packages")
def get_evidence_packages(
    case_status: Optional[str] = None,
    classification: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[UserModel] = Depends(get_current_user_optional)
):
    query = db.query(PoliceEvidencePackageModel)
    if case_status:
        query = query.filter(PoliceEvidencePackageModel.case_status == case_status)
    if classification:
        query = query.filter(PoliceEvidencePackageModel.classification_level == classification)
    
    packages = query.order_by(PoliceEvidencePackageModel.created_at.desc()).all()
    return [_format_package(p) for p in packages]

@router.get("/evidence-packages/{id}")
def get_single_evidence_package(
    id: str,
    db: Session = Depends(get_db)
):
    pkg = db.query(PoliceEvidencePackageModel).filter(PoliceEvidencePackageModel.id == id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Police evidence package not found")
    return _format_package(pkg)

@router.post("/evidence-packages", status_code=status.HTTP_201_CREATED)
def create_evidence_package(
    body: CreateEvidencePackageRequest,
    db: Session = Depends(get_db),
    user: Optional[UserModel] = Depends(get_current_user_optional)
):
    # Generate cryptographic SHA-256 evidence hashes
    vid_hash = _compute_sha256(body.video_clip_url)
    snap_hash = _compute_sha256(body.snapshot_url)
    
    # Case Number format: FIR-2026-DEL-XXXX
    case_no = f"FIR-2026-DEL-{str(uuid.uuid4().hex[:4]).upper()}"

    officer_agent_name = (user.name if (user and isinstance(user, UserModel)) else body.reviewer_name) or "CivicLens Triage Officer"

    initial_custody = [
        {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "action": "EVIDENCE_INGESTION_AND_CRYPTOGRAPHIC_SEAL",
            "officer_or_agent": f"{officer_agent_name} (CivicLens AI)",
            "details": f"Generated SHA-256 seal for camera feed {body.camera_code}. Triage notes: {body.reviewer_notes or 'No remarks'}."
        },
        {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "action": "TRANSFER_TO_POLICE_AUTHORITY",
            "officer_or_agent": "CivicLens Evidence Broker",
            "details": f"Dispatched evidentiary package to {body.assigned_police_dept} under Case #{case_no}."
        }
    ]

    new_pkg = PoliceEvidencePackageModel(
        incident_report_id=body.incident_report_id,
        detection_id=body.detection_id,
        case_number=case_no,
        title=body.title,
        category=body.category,
        location_name=body.location_name,
        latitude=body.latitude,
        longitude=body.longitude,
        camera_code=body.camera_code,
        video_clip_url=body.video_clip_url,
        video_hash_sha256=vid_hash,
        snapshot_url=body.snapshot_url,
        snapshot_hash_sha256=snap_hash,
        chain_of_custody_log=json.dumps(initial_custody),
        assigned_police_dept=body.assigned_police_dept,
        case_status="submitted_to_police",
        classification_level=body.classification_level or "Restricted"
    )

    db.add(new_pkg)
    db.commit()
    db.refresh(new_pkg)
    return _format_package(new_pkg)

@router.patch("/evidence-packages/{id}/status")
def update_case_status(
    id: str,
    body: UpdateCaseStatusRequest,
    db: Session = Depends(get_db),
    user: Optional[UserModel] = Depends(get_current_user_optional)
):
    pkg = db.query(PoliceEvidencePackageModel).filter(PoliceEvidencePackageModel.id == id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Police evidence package not found")

    old_status = pkg.case_status
    pkg.case_status = body.case_status
    pkg.updated_at = datetime.now(timezone.utc)

    is_valid_user = user and isinstance(user, UserModel)
    if body.officer_badge_id:
        pkg.officer_badge_id = body.officer_badge_id
    elif is_valid_user and user.police_badge_id:
        pkg.officer_badge_id = user.police_badge_id

    # Append to chain of custody
    custody = []
    if pkg.chain_of_custody_log:
        try:
            custody = json.loads(pkg.chain_of_custody_log)
        except Exception:
            custody = []

    badge = body.officer_badge_id or (user.police_badge_id if is_valid_user else None) or "POLICE-HQ"
    officer_label = body.officer_name or (user.name if is_valid_user else "Investigating Officer")

    custody.append({
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "action": f"CASE_STATUS_CHANGED: {old_status.upper()} -> {body.case_status.upper()}",
        "officer_or_agent": f"{officer_label} (Badge: {badge})",
        "details": body.investigation_notes or f"Official police status transition to {body.case_status}."
    })

    pkg.chain_of_custody_log = json.dumps(custody)
    db.commit()
    db.refresh(pkg)
    return _format_package(pkg)

@router.post("/evidence-packages/{id}/audit-log")
def add_custody_entry(
    id: str,
    body: AddCustodyEntryRequest,
    db: Session = Depends(get_db)
):
    pkg = db.query(PoliceEvidencePackageModel).filter(PoliceEvidencePackageModel.id == id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Police evidence package not found")

    custody = []
    if pkg.chain_of_custody_log:
        try:
            custody = json.loads(pkg.chain_of_custody_log)
        except Exception:
            custody = []

    custody.append({
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "action": body.action,
        "officer_or_agent": body.officer_or_agent,
        "details": body.details
    })

    pkg.chain_of_custody_log = json.dumps(custody)
    pkg.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pkg)
    return _format_package(pkg)
