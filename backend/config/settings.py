import os
from functools import lru_cache
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application runtime configuration loaded from environment variables."""

    APP_NAME: str = os.getenv("APP_NAME", "QueueFlow API")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS Origins (comma-separated or list)
    _cors_env: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    )
    CORS_ORIGINS: List[str] = [
        origin.strip() for origin in _cors_env.split(",") if origin.strip()
    ]

    # MongoDB Configuration - Never hardcode credentials
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "queueflow_db")
    MONGODB_TIMEOUT_MS: int = int(os.getenv("MONGODB_TIMEOUT_MS", "3000"))

    # Security Configuration
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "queueflow-default-dev-secret-key-change-in-production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )


@lru_cache()
def get_settings() -> Settings:
    """Return cached instance of application settings."""
    return Settings()

