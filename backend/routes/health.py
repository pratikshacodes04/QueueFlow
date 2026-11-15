from fastapi import APIRouter
from controllers.health_controller import HealthController
from schemas.health import RootResponse, HealthResponse

router = APIRouter(tags=["Health & Status"])


@router.get("/", response_model=RootResponse, summary="Root API Endpoint")
def read_root():
    """Welcome endpoint providing metadata and documentation links."""
    return HealthController.get_root()


@router.get("/health", response_model=HealthResponse, summary="Health Check")
def read_health():
    """
    Comprehensive system health check.
    Pings MongoDB and returns application and database status.
    """
    return HealthController.get_health()


# Provide alias /api/health for frontend or external monitors
@router.get("/api/health", response_model=HealthResponse, summary="Health Check Alias")
def read_api_health():
    """Health check alias under /api/health."""
    return HealthController.get_health()

