import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicLens AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./civiclens.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "civiclens-super-secret-key-change-in-prod-12345")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
