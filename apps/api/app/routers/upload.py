import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/upload", tags=["Media Upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_image(file: UploadFile = File(...)):
    # Validate content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")
    
    # Generate unique safe filename
    ext = os.path.splitext(file.filename or "")[1]
    if not ext:
        ext = ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext.lower()}"
    target_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    url = f"http://localhost:8000/uploads/{unique_filename}"
    return {
        "success": True,
        "filename": unique_filename,
        "url": url,
        "content_type": file.content_type
    }
