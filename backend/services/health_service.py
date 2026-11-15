from datetime import datetime, timezone
from config.database import DatabaseManager
from config.settings import get_settings


class HealthService:
    """Service responsible for evaluating application and database health."""

    @staticmethod
    def get_health_status() -> dict:
        settings = get_settings()
        db_health = DatabaseManager.check_health()

        # Overall status is healthy if DB is responsive; degraded if DB is not reachable
        status = "healthy" if db_health["connected"] else "degraded"

        return {
            "status": status,
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": db_health,
        }

