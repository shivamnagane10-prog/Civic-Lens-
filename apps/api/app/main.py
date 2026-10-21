import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed import seed_database
from app.routers import auth, issues, wards, work_orders, crews, websocket, internal, upload, ml_router, cctv, satellite


# Ensure tables and seed data exist
Base.metadata.create_all(bind=engine)
_seed_db = SessionLocal()
try:
    seed_database(_seed_db)
finally:
    _seed_db.close()

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CivicLens AI — Smart Civic Infrastructure Issue Classification & Dispatch System",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(issues.router, prefix=settings.API_PREFIX)
app.include_router(wards.router, prefix=settings.API_PREFIX)
app.include_router(work_orders.router, prefix=settings.API_PREFIX)
app.include_router(crews.router, prefix=settings.API_PREFIX)
app.include_router(internal.router, prefix=settings.API_PREFIX)
app.include_router(upload.router, prefix=settings.API_PREFIX)
app.include_router(ml_router.router, prefix=settings.API_PREFIX)
app.include_router(cctv.router, prefix=settings.API_PREFIX)
app.include_router(satellite.router, prefix=settings.API_PREFIX)
app.include_router(websocket.router)



@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
