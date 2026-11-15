from fastapi import status
from fastapi.responses import JSONResponse
from config.settings import get_settings
from services.health_service import HealthService
from schemas.health import RootResponse


class HealthController:
    """Controller handling requests for root information and health status."""

    @staticmethod
    def get_root() -> RootResponse:
        settings = get_settings()
        return RootResponse(
            message=f"Welcome to {settings.APP_NAME}",
            app=settings.APP_NAME,
            version=settings.APP_VERSION,
            docs_url="/docs",
            health_url="/health",
        )

    @staticmethod
    def get_health() -> JSONResponse:
        health_data = HealthService.get_health_status()
        # Return HTTP 200 with detailed status report
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=health_data,
        )

