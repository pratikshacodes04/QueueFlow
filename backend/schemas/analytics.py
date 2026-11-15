"""Schemas for analytics metrics and reporting."""

from typing import List, Optional, Dict
from pydantic import BaseModel


class AnalyticsKPIs(BaseModel):
    total_queues: int
    total_tokens: int
    currently_waiting: int
    currently_serving: int
    completed: int
    cancelled: int
    avg_wait_minutes: Optional[float] = None
    avg_service_minutes: Optional[float] = None


class ActivityPoint(BaseModel):
    date: str  # YYYY-MM-DD
    created: int
    completed: int


class StatusDistribution(BaseModel):
    status: str
    count: int


class QueueVolume(BaseModel):
    queue_id: str
    queue_name: str
    queue_code: str
    token_count: int


class AnalyticsOverviewResponse(BaseModel):
    timeframe: str
    kpis: AnalyticsKPIs
    activity_timeline: List[ActivityPoint]
    status_distribution: List[StatusDistribution]
    queue_volume: List[QueueVolume]

