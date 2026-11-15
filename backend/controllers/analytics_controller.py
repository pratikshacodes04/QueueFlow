"""Analytics controller handling overview metrics and reports."""

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from config.database import get_db
from utils.auth_dependencies import get_current_active_user
from services.analytics_service import AnalyticsService
from schemas.analytics import AnalyticsOverviewResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Get Analytics Overview for Authenticated Manager",
)
def get_analytics_overview(
    timeframe: str = Query("7d", pattern="^(today|7d|30d)$", description="Aggregation timeframe"),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Return manager-isolated analytics KPIs, status distribution, and timelines."""
    return AnalyticsService.get_overview(db, current_user["id"], timeframe)
