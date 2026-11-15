import pytest
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

from services.auth_service import AuthService
from services.queue_service import QueueService
from services.token_service import TokenService
from services.analytics_service import AnalyticsService


@pytest.fixture
def mock_db():
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
    db_name = f"queueflow_test_{int(datetime.now(timezone.utc).timestamp())}"
    db = client[db_name]
    yield db
    client.drop_database(db_name)
    client.close()


def test_manager_registration_and_login(mock_db):
    user = AuthService.register_manager(
        mock_db,
        {"name": "Manager One", "email": "m1@example.com", "password": "password123"},
    )
    assert user["email"] == "m1@example.com"
    assert "password_hash" not in user

    # Duplicate registration rejected
    with pytest.raises(ValueError):
        AuthService.register_manager(
            mock_db,
            {"name": "Duplicate", "email": "m1@example.com", "password": "password123"},
        )

    # Login
    auth_data = AuthService.login_manager(
        mock_db, {"email": "m1@example.com", "password": "password123"}
    )
    assert "access_token" in auth_data
    assert auth_data["user"]["email"] == "m1@example.com"


def test_queue_and_token_full_lifecycle(mock_db):
    # Register two managers
    m1 = AuthService.register_manager(
        mock_db, {"name": "M1", "email": "m1@test.com", "password": "pass"}
    )
    m2 = AuthService.register_manager(
        mock_db, {"name": "M2", "email": "m2@test.com", "password": "pass"}
    )

    # M1 creates a queue
    q1 = QueueService.create_queue(
        mock_db,
        m1["id"],
        {"name": "Support Desk", "code": "SUP", "description": "Support"},
    )
    assert q1["status"] == "ACTIVE"
    assert q1["code"] == "SUP"

    # M2 cannot access M1's queue
    with pytest.raises(ValueError):
        QueueService.get_queue(mock_db, m2["id"], q1["id"])

    # M1 creates 3 tokens
    t1 = TokenService.create_token(
        mock_db, m1["id"], q1["id"], {"customer_name": "Alice"}
    )
    t2 = TokenService.create_token(
        mock_db, m1["id"], q1["id"], {"customer_name": "Bob"}
    )
    t3 = TokenService.create_token(
        mock_db, m1["id"], q1["id"], {"customer_name": "Charlie"}
    )

    assert t1["position"] == 1
    assert t2["position"] == 2
    assert t3["position"] == 3
    assert t1["status"] == "WAITING"

    # Move Bob (t2) UP
    moved_bob = TokenService.move_token(mock_db, m1["id"], t2["id"], "UP")
    assert moved_bob["position"] == 1

    # Verify Alice is now position 2
    refreshed_alice = TokenService.get_token(mock_db, m1["id"], t1["id"])
    assert refreshed_alice["position"] == 2

    # Cancel Alice
    cancelled_alice = TokenService.cancel_token(mock_db, m1["id"], t1["id"])
    assert cancelled_alice["status"] == "CANCELLED"
    assert cancelled_alice["position"] is None

    # Charlie was position 3, should now be shifted to position 2
    refreshed_charlie = TokenService.get_token(mock_db, m1["id"], t3["id"])
    assert refreshed_charlie["position"] == 2

    # Call Next Customer (should be Bob)
    called = TokenService.call_next(mock_db, m1["id"], q1["id"])
    assert called["id"] == t2["id"]
    assert called["status"] == "SERVING"
    assert called["called_at"] is not None

    # Charlie should now be position 1
    refreshed_charlie = TokenService.get_token(mock_db, m1["id"], t3["id"])
    assert refreshed_charlie["position"] == 1

    # Calling next again while Bob is SERVING must be rejected
    with pytest.raises(ValueError, match="currently being served"):
        TokenService.call_next(mock_db, m1["id"], q1["id"])

    # Complete Bob's service
    completed_bob = TokenService.complete_token(mock_db, m1["id"], t2["id"])
    assert completed_bob["status"] == "COMPLETED"
    assert completed_bob["completed_at"] is not None

    # Cannot complete already completed token
    with pytest.raises(ValueError):
        TokenService.complete_token(mock_db, m1["id"], t2["id"])

    # Now calling next works for Charlie
    called_charlie = TokenService.call_next(mock_db, m1["id"], q1["id"])
    assert called_charlie["id"] == t3["id"]
    assert called_charlie["status"] == "SERVING"

    # Check analytics for M1
    analytics = AnalyticsService.get_overview(mock_db, m1["id"], "7d")
    assert analytics["kpis"]["total_queues"] == 1
    assert analytics["kpis"]["total_tokens"] == 3
    assert analytics["kpis"]["currently_serving"] == 1
    assert analytics["kpis"]["completed"] == 1
    assert analytics["kpis"]["cancelled"] == 1

    # Check analytics for M2 (data isolation - must be 0)
    m2_analytics = AnalyticsService.get_overview(mock_db, m2["id"], "7d")
    assert m2_analytics["kpis"]["total_queues"] == 0
    assert m2_analytics["kpis"]["total_tokens"] == 0
