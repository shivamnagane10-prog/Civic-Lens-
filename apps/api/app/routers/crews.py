from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.crew import CrewModel
from app.schemas.crew import CrewResponse, CrewLocationUpdate
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/crews", tags=["Crews"])

@router.get("", response_model=List[CrewResponse])
def get_crews(
    ward_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(CrewModel)
    if ward_id:
        query = query.filter(CrewModel.ward_id == ward_id)
    if status:
        query = query.filter(CrewModel.status == status)
    return query.all()

@router.get("/{id}", response_model=CrewResponse)
def get_crew(id: str, db: Session = Depends(get_db)):
    crew = db.query(CrewModel).filter(CrewModel.id == id).first()
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")
    return crew

@router.patch("/{id}/location", response_model=CrewResponse)
async def update_crew_location(
    id: str,
    body: CrewLocationUpdate,
    db: Session = Depends(get_db)
):
    crew = db.query(CrewModel).filter(CrewModel.id == id).first()
    if not crew:
        raise HTTPException(status_code=404, detail="Crew not found")

    crew.latitude = body.latitude
    crew.longitude = body.longitude
    if body.status:
        crew.status = body.status

    db.commit()
    db.refresh(crew)

    payload = {
        "id": crew.id,
        "name": crew.name,
        "ward_id": crew.ward_id,
        "latitude": crew.latitude,
        "longitude": crew.longitude,
        "status": crew.status
    }
    await ws_manager.broadcast("CREW_LOCATION_UPDATED", payload)

    return crew
