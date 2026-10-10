from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.work_order import WorkOrderModel
from app.models.issue import IssueModel
from app.models.crew import CrewModel
from app.models.status_event import StatusEventModel
from app.schemas.work_order import WorkOrderCreate, WorkOrderResponse, WorkOrderStatusUpdate
from app.schemas.crew import CrewSuggestionResponse, CrewResponse
from app.services.crew_dispatch_service import CrewDispatchService
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/work_orders", tags=["Work Orders"])

@router.get("", response_model=List[WorkOrderResponse])
def get_work_orders(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(WorkOrderModel)
    if status:
        query = query.filter(WorkOrderModel.status == status)
    
    orders = query.order_by(WorkOrderModel.priority_score.desc(), WorkOrderModel.created_at.desc()).all()
    
    results = []
    for o in orders:
        issue = db.query(IssueModel).filter(IssueModel.id == o.issue_id).first()
        crew = db.query(CrewModel).filter(CrewModel.id == o.assigned_crew_id).first() if o.assigned_crew_id else None
        
        results.append(WorkOrderResponse(
            id=o.id,
            issue_id=o.issue_id,
            assigned_crew_id=o.assigned_crew_id,
            priority_score=o.priority_score,
            status=o.status,
            created_at=o.created_at,
            completed_at=o.completed_at,
            issue=issue,
            crew=crew
        ))
    return results

@router.post("", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_work_order(body: WorkOrderCreate, db: Session = Depends(get_db)):
    issue = db.query(IssueModel).filter(IssueModel.id == body.issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    wo = WorkOrderModel(
        issue_id=body.issue_id,
        assigned_crew_id=body.assigned_crew_id,
        priority_score=body.priority_score or issue.priority_score,
        status="assigned" if body.assigned_crew_id else "pending"
    )
    db.add(wo)

    if body.assigned_crew_id:
        crew = db.query(CrewModel).filter(CrewModel.id == body.assigned_crew_id).first()
        if crew:
            crew.status = "dispatched"
        issue.status = "acknowledged"

    db.commit()
    db.refresh(wo)

    payload = {
        "id": wo.id,
        "issue_id": wo.issue_id,
        "assigned_crew_id": wo.assigned_crew_id,
        "priority_score": wo.priority_score,
        "status": wo.status
    }
    await ws_manager.broadcast("WORK_ORDER_UPDATED", payload)

    return WorkOrderResponse(
        id=wo.id,
        issue_id=wo.issue_id,
        assigned_crew_id=wo.assigned_crew_id,
        priority_score=wo.priority_score,
        status=wo.status,
        created_at=wo.created_at,
        completed_at=wo.completed_at,
        issue=issue
    )

@router.get("/suggestions", response_model=List[CrewSuggestionResponse])
def get_crew_suggestions(issue_id: str, db: Session = Depends(get_db)):
    issue = db.query(IssueModel).filter(IssueModel.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    crews = db.query(CrewModel).all()
    suggestions = CrewDispatchService.rank_crews_for_issue(issue.latitude, issue.longitude, crews)

    return [
        CrewSuggestionResponse(
            crew=CrewResponse.model_validate(s["crew"]),
            distance_km=s["distance_km"],
            estimated_eta_minutes=s["estimated_eta_minutes"],
            recommended_score=s["recommended_score"]
        )
        for s in suggestions
    ]

@router.patch("/{id}/status", response_model=WorkOrderResponse)
async def update_work_order_status(
    id: str,
    body: WorkOrderStatusUpdate,
    db: Session = Depends(get_db)
):
    wo = db.query(WorkOrderModel).filter(WorkOrderModel.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    wo.status = body.status
    if body.assigned_crew_id:
        wo.assigned_crew_id = body.assigned_crew_id
        crew = db.query(CrewModel).filter(CrewModel.id == body.assigned_crew_id).first()
        if crew and body.status in ["assigned", "in_progress"]:
            crew.status = "dispatched"

    if body.status == "completed":
        wo.completed_at = datetime.now(timezone.utc)
        issue = db.query(IssueModel).filter(IssueModel.id == wo.issue_id).first()
        if issue:
            issue.status = "resolved"
            issue.resolved_at = datetime.now(timezone.utc)
            # Add status event
            event = StatusEventModel(
                issue_id=issue.id,
                old_status="in_progress",
                new_status="resolved",
                actor_id=wo.assigned_crew_id,
                actor_role="crew",
                comment="Work order completed by crew"
            )
            db.add(event)
        if wo.assigned_crew_id:
            crew = db.query(CrewModel).filter(CrewModel.id == wo.assigned_crew_id).first()
            if crew:
                crew.status = "available"

    db.commit()
    db.refresh(wo)

    payload = {
        "id": wo.id,
        "issue_id": wo.issue_id,
        "assigned_crew_id": wo.assigned_crew_id,
        "priority_score": wo.priority_score,
        "status": wo.status
    }
    await ws_manager.broadcast("WORK_ORDER_UPDATED", payload)

    issue = db.query(IssueModel).filter(IssueModel.id == wo.issue_id).first()
    crew = db.query(CrewModel).filter(CrewModel.id == wo.assigned_crew_id).first() if wo.assigned_crew_id else None

    return WorkOrderResponse(
        id=wo.id,
        issue_id=wo.issue_id,
        assigned_crew_id=wo.assigned_crew_id,
        priority_score=wo.priority_score,
        status=wo.status,
        created_at=wo.created_at,
        completed_at=wo.completed_at,
        issue=issue,
        crew=crew
    )
