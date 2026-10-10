import json
from typing import Optional, Literal
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.issue import IssueModel
from app.models.status_event import StatusEventModel
from app.models.work_order import WorkOrderModel
from app.ml.classifier import CivicAIClassifier
from app.services.prioritization_service import PrioritizationService
from app.services.websocket_manager import ws_manager
from app.schemas.issue import IssueResponse
from app.routers.issues import _format_issue_response

router = APIRouter(prefix="/internal", tags=["Internal Feed Ingestion"])

class InternalDetectionPayload(BaseModel):
    source: Literal["cctv", "satellite", "iot"]
    device_id: str = Field(..., json_schema_extra={"example": "CAM-DOWNTOWN-04"})
    category: str = Field(..., json_schema_extra={"example": "pothole"})
    latitude: float = Field(..., json_schema_extra={"example": 37.7749})
    longitude: float = Field(..., json_schema_extra={"example": -122.4194})
    ward_id: str = Field("WARD-01", json_schema_extra={"example": "WARD-01"})
    confidence: Optional[float] = 0.94
    photo_url: Optional[str] = None
    telemetry_metadata: Optional[dict] = None

@router.post("/detections", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def ingest_internal_detection(
    body: InternalDetectionPayload,
    x_internal_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    # Service-to-service validation (can be secured with API key)
    # Reuses existing issues / status_events pipeline per architectural requirement
    analysis = CivicAIClassifier.classify_and_diagnose(
        category_hint=body.category,
        description=f"Automated sensor detection from {body.source.upper()} device {body.device_id}",
        photo_url=body.photo_url
    )

    detected_category = analysis["category"]
    severity = analysis["severity"]
    confidence = body.confidence or analysis["confidence"]

    priority_score = PrioritizationService.calculate_priority_score(
        category=detected_category,
        severity=severity,
        source=body.source,
        ai_confidence=confidence
    )

    issue = IssueModel(
        reporter_id=None,
        reporter_phone=f"SYSTEM:{body.device_id}",
        title=f"AI Detection ({body.source.upper()}): {detected_category.replace('_', ' ').capitalize()}",
        description=f"Automated detection from feed {body.device_id}. Source: {body.source}",
        category=detected_category,
        severity=severity,
        status="reported",
        latitude=body.latitude,
        longitude=body.longitude,
        ward_id=body.ward_id,
        photo_url=body.photo_url or "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
        ai_confidence=confidence,
        source=body.source,
        priority_score=priority_score,
        diagnostic_card=json.dumps(analysis["diagnostic_card"])
    )

    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Status event tracking
    event = StatusEventModel(
        issue_id=issue.id,
        old_status=None,
        new_status="reported",
        actor_id=body.device_id,
        actor_role="iot_sensor",
        comment=f"Ingested via {body.source.upper()} ingestion bridge"
    )
    db.add(event)

    # Auto create work order if priority threshold exceeded
    if priority_score >= 65.0:
        wo = WorkOrderModel(
            issue_id=issue.id,
            priority_score=priority_score,
            status="pending"
        )
        db.add(wo)

    db.commit()

    resp = _format_issue_response(issue)
    await ws_manager.broadcast("ISSUE_CREATED", resp)

    return resp
