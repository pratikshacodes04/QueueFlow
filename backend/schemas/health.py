from typing import Optional
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    connected: bool = Field(
        ..., description="Whether database connection is active and responsive"
    )
    database: str = Field(..., description="Target database name")
    latency_ms: Optional[float] = Field(
        None, description="Ping latency in milliseconds"
    )
    error: Optional[str] = Field(
        None, description="Connection error message if unavailable"
    )


class HealthResponse(BaseModel):
    status: str = Field(
        ...,
        description="Overall service status: 'healthy', 'degraded', or 'unhealthy'",
    )
    app: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of check")
    database: DatabaseHealth = Field(
        ..., description="Database connection health details"
    )


class RootResponse(BaseModel):
    message: str = Field(..., description="Welcome greeting")
    app: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    docs_url: str = Field(..., description="Interactive API documentation URL")
    health_url: str = Field(..., description="API health check URL")

