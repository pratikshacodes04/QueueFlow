"""Analytics service for QueueFlow.

Aggregates operational metrics, KPIs, status distribution, and timelines
scoped strictly to queues and tokens belonging to the authenticated manager.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from bson import ObjectId
from pymongo.database import Database


class AnalyticsService:
    @staticmethod
    def get_overview(db: Database, manager_id: str, timeframe: str = "7d") -> Dict[str, Any]:
        manager_oid = ObjectId(manager_id)
        now = datetime.now(timezone.utc)

        # Determine timeframe start boundary
        timeframe = timeframe.lower()
        if timeframe == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            num_days = 1
        elif timeframe == "30d":
            start_date = now - timedelta(days=30)
            num_days = 31
        else:  # default "7d"
            timeframe = "7d"
            start_date = now - timedelta(days=7)
            num_days = 8

        start_iso = start_date.isoformat()

        # 1. Queues owned by this manager
        queues = list(db["queues"].find({"manager_id": manager_oid}))
        total_queues = len(queues)
        queue_dict = {str(q["_id"]): q for q in queues}

        # 2. Real-time active token counts (current snapshot)
        currently_waiting = db["tokens"].count_documents(
            {"manager_id": manager_oid, "status": "WAITING"}
        )
        currently_serving = db["tokens"].count_documents(
            {"manager_id": manager_oid, "status": "SERVING"}
        )

        # 3. Timeframe-scoped tokens
        tokens_cursor = db["tokens"].find({
            "manager_id": manager_oid,
            "created_at": {"$gte": start_iso},
        })
        tokens = list(tokens_cursor)
        total_tokens = len(tokens)

        completed_count = sum(1 for t in tokens if t.get("status") == "COMPLETED")
        cancelled_count = sum(1 for t in tokens if t.get("status") == "CANCELLED")

        # 4. Wait time calculation (called_at - created_at)
        wait_times_min: List[float] = []
        for t in tokens:
            if t.get("called_at") and t.get("created_at"):
                try:
                    c_time = datetime.fromisoformat(t["created_at"])
                    call_time = datetime.fromisoformat(t["called_at"])
                    diff = (call_time - c_time).total_seconds() / 60.0
                    if diff >= 0:
                        wait_times_min.append(diff)
                except Exception:
                    pass

        avg_wait_minutes = (
            round(sum(wait_times_min) / len(wait_times_min), 1)
            if wait_times_min
            else None
        )

        # 5. Service duration calculation (completed_at - called_at)
        service_durations_min: List[float] = []
        for t in tokens:
            if t.get("completed_at") and t.get("called_at"):
                try:
                    call_time = datetime.fromisoformat(t["called_at"])
                    comp_time = datetime.fromisoformat(t["completed_at"])
                    diff = (comp_time - call_time).total_seconds() / 60.0
                    if diff >= 0:
                        service_durations_min.append(diff)
                except Exception:
                    pass

        avg_service_minutes = (
            round(sum(service_durations_min) / len(service_durations_min), 1)
            if service_durations_min
            else None
        )

        # 6. Status distribution
        status_counts = {"WAITING": 0, "SERVING": 0, "COMPLETED": 0, "CANCELLED": 0}
        for t in tokens:
            st = t.get("status")
            if st in status_counts:
                status_counts[st] += 1
        status_distribution = [
            {"status": k, "count": v} for k, v in status_counts.items()
        ]

        # 7. Activity timeline (daily created and completed)
        daily_activity: Dict[str, Dict[str, int]] = {}
        for day_offset in range(num_days):
            d_str = (start_date + timedelta(days=day_offset)).strftime("%Y-%m-%d")
            daily_activity[d_str] = {"created": 0, "completed": 0}

        for t in tokens:
            c_iso = t.get("created_at")
            if c_iso:
                d_str = c_iso[:10]
                if d_str in daily_activity:
                    daily_activity[d_str]["created"] += 1
            comp_iso = t.get("completed_at")
            if comp_iso:
                d_str = comp_iso[:10]
                if d_str in daily_activity:
                    daily_activity[d_str]["completed"] += 1

        activity_timeline = [
            {"date": d, "created": daily_activity[d]["created"], "completed": daily_activity[d]["completed"]}
            for d in sorted(daily_activity.keys())
        ]

        # 8. Queue volume breakdown
        queue_counts: Dict[str, int] = {str(q["_id"]): 0 for q in queues}
        for t in tokens:
            qid = str(t.get("queue_id"))
            if qid in queue_counts:
                queue_counts[qid] += 1

        queue_volume = [
            {
                "queue_id": qid,
                "queue_name": queue_dict[qid].get("name", "Unknown"),
                "queue_code": queue_dict[qid].get("code", "UNK"),
                "token_count": count,
            }
            for qid, count in queue_counts.items()
        ]

        return {
            "timeframe": timeframe,
            "kpis": {
                "total_queues": total_queues,
                "total_tokens": total_tokens,
                "currently_waiting": currently_waiting,
                "currently_serving": currently_serving,
                "completed": completed_count,
                "cancelled": cancelled_count,
                "avg_wait_minutes": avg_wait_minutes,
                "avg_service_minutes": avg_service_minutes,
            },
            "activity_timeline": activity_timeline,
            "status_distribution": status_distribution,
            "queue_volume": queue_volume,
        }

