from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.ml.vision_service import CivicVisionService

router = APIRouter(prefix="/ml", tags=["Machine Learning Vision Inference"])

class ImageClassifyRequest(BaseModel):
    image_url: Optional[str] = None

@router.post("/classify-image")
async def classify_image_endpoint(
    image_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Real AI Vision model inference endpoint.
    Classifies civic hazard directly from image pixels:
    - Pothole
    - Water Leak / Flood
    - Drainage Broken
    - Garbage / Waste
    - Streetlight
    - Road Damage / Cracks
    """
    image_bytes = None
    if file:
        image_bytes = await file.read()

    result = await CivicVisionService.classify_image(
        image_bytes=image_bytes,
        image_url=image_url
    )

    return result
