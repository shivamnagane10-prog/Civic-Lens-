import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.issue import IssueModel
from app.models.status_event import StatusEventModel
from app.models.work_order import WorkOrderModel
from app.schemas.issue import IssueCreate, IssueResponse, IssueStatusUpdate
from app.services.auth_service import get_current_user_optional
from app.services.websocket_manager import ws_manager
from app.ml.classifier import CivicAIClassifier
from app.ml.vision_service import CivicVisionService
from app.services.prioritization_service import PrioritizationService
from app.services.crew_dispatch_service import haversine_distance_km

router = APIRouter(prefix="/issues", tags=["Issues"])

def _format_issue_response(issue: IssueModel) -> dict:
    diag = None
    if issue.diagnostic_card:
        try:
            diag = json.loads(issue.diagnostic_card)
        except Exception:
            diag = None

    return {
        "id": issue.id,
        "reporter_id": issue.reporter_id,
        "reporter_phone": issue.reporter_phone,
        "title": issue.title or f"{issue.category.replace('_', ' ').capitalize()} reported",
        "description": issue.description,
        "category": issue.category,
        "severity": issue.severity,
        "status": issue.status,
        "latitude": issue.latitude,
        "longitude": issue.longitude,
        "ward_id": issue.ward_id,
        "photo_url": issue.photo_url,
        "ai_confidence": issue.ai_confidence,
        "source": issue.source,
        "priority_score": issue.priority_score,
        "diagnostic_card": diag,
        "created_at": issue.created_at,
        "resolved_at": issue.resolved_at
    }

@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    body: IssueCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user_optional)
):
    # Run AI Vision model if photo is provided, otherwise fall back to rule-based diagnostic analysis
    if body.photo_url and len(body.photo_url) > 5:
        vision_res = await CivicVisionService.classify_image(image_url=body.photo_url)
        detected_category = vision_res["detected_category"]
        detected_severity = body.severity or vision_res["severity"]
        confidence = vision_res["confidence"]
        diag_card = vision_res["diagnostic_card"]
    else:
        analysis = CivicAIClassifier.classify_and_diagnose(
            category_hint=body.category,
            description=body.description,
            photo_url=body.photo_url
        )
        detected_category = analysis["category"]
        detected_severity = body.severity or analysis["severity"]
        confidence = analysis["confidence"]
        diag_card = analysis["diagnostic_card"]

    # Calculate initial priority score
    priority_score = PrioritizationService.calculate_priority_score(
        category=detected_category,
        severity=detected_severity,
        source=body.source or "citizen",
        ai_confidence=confidence
    )

    reporter_id = user.id if user else body.reporter_id
    reporter_phone = user.phone if user else body.reporter_phone

    new_issue = IssueModel(
        reporter_id=reporter_id,
        reporter_phone=reporter_phone,
        title=body.title or f"{detected_category.replace('_', ' ').capitalize()} near {round(body.latitude, 4)}, {round(body.longitude, 4)}",
        description=body.description,
        category=detected_category,
        severity=detected_severity,
        status="reported",
        latitude=body.latitude,
        longitude=body.longitude,
        ward_id=body.ward_id or "WARD-01",
        photo_url=body.photo_url,
        ai_confidence=confidence,
        source=body.source or "citizen",
        priority_score=priority_score,
        diagnostic_card=json.dumps(diag_card)
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    # Record initial status event
    event = StatusEventModel(
        issue_id=new_issue.id,
        old_status=None,
        new_status="reported",
        actor_id=reporter_id,
        actor_role="citizen" if not user else user.role,
        comment="Issue reported via " + (body.source or "citizen app")
    )
    db.add(event)

    # If priority score >= 70, automatically initiate a work order
    if priority_score >= 70.0:
        wo = WorkOrderModel(
            issue_id=new_issue.id,
            priority_score=priority_score,
            status="pending"
        )
        db.add(wo)

    db.commit()

    resp = _format_issue_response(new_issue)

    # Real-time WebSocket broadcast
    await ws_manager.broadcast("ISSUE_CREATED", resp)

    return resp

@router.get("", response_model=List[IssueResponse])
def list_issues(
    ward_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    near: Optional[str] = Query(None, description="lat,lng"),
    radius: Optional[float] = Query(5.0, description="radius in km"),
    db: Session = Depends(get_db)
):
    query = db.query(IssueModel)

    if ward_id:
        query = query.filter(IssueModel.ward_id == ward_id)
    if status_filter:
        query = query.filter(IssueModel.status == status_filter)
    if category:
        query = query.filter(IssueModel.category == category)
    if source:
        query = query.filter(IssueModel.source == source)

    issues = query.order_by(IssueModel.priority_score.desc(), IssueModel.created_at.desc()).all()

    # If 'near' coordinates provided (Phase 4 Citizen Near Me feature)
    if near:
        try:
            parts = [float(x.strip()) for x in near.split(",")]
            center_lat, center_lon = parts[0], parts[1]
            filtered = []
            for item in issues:
                dist = haversine_distance_km(center_lat, center_lon, item.latitude, item.longitude)
                if dist <= radius:
                    filtered.append(item)
            issues = filtered
        except Exception:
            pass

    return [_format_issue_response(i) for i in issues]

@router.get("/{id}", response_model=IssueResponse)
def get_issue(id: str, db: Session = Depends(get_db)):
    issue = db.query(IssueModel).filter(IssueModel.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _format_issue_response(issue)

@router.patch("/{id}/status", response_model=IssueResponse)
async def update_issue_status(
    id: str,
    body: IssueStatusUpdate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user_optional)
):
    issue = db.query(IssueModel).filter(IssueModel.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    old_status = issue.status
    issue.status = body.status
    if body.status == "resolved":
        issue.resolved_at = datetime.now(timezone.utc)

    # Record status transition event
    actor_id = user.id if user else body.actor_id
    actor_role = user.role if user else body.actor_role
    event = StatusEventModel(
        issue_id=issue.id,
        old_status=old_status,
        new_status=body.status,
        actor_id=actor_id,
        actor_role=actor_role or "official",
        comment=body.comment or f"Status transitioned to {body.status}"
    )
    db.add(event)

    # Sync corresponding work order if present
    wo = db.query(WorkOrderModel).filter(WorkOrderModel.issue_id == issue.id).first()
    if wo:
        if body.status == "in_progress":
            wo.status = "in_progress"
        elif body.status == "resolved":
            wo.status = "completed"
            wo.completed_at = datetime.now(timezone.utc)
        elif body.status == "rejected":
            wo.status = "cancelled"

    db.commit()
    db.refresh(issue)

    resp = _format_issue_response(issue)
    await ws_manager.broadcast("ISSUE_STATUS_CHANGED", resp)

    return resp
