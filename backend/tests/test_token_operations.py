import pytest
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

from services.auth_service import AuthService
from services.queue_service import QueueService
from services.token_service import TokenService


@pytest.fixture
def mock_db():
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
    db_name = f"queueflow_token_test_{int(datetime.now(timezone.utc).timestamp())}"
    db = client[db_name]
    yield db
    client.drop_database(db_name)
    client.close()


def test_token_creation_and_stats(mock_db):
    m = AuthService.register_manager(
        mock_db, {"name": "Manager", "email": "tok_m@test.com", "password": "pass"}
    )
    q = QueueService.create_queue(
        mock_db, m["id"], {"name": "Billing Desk", "code": "BIL"}
    )

    # Create tokens
    t1 = TokenService.create_token(
        mock_db, m["id"], q["id"], {"customer_name": "Alice", "customer_phone": "12345"}
    )
    assert t1["customer_name"] == "Alice"
    assert t1["customer_phone"] == "12345"
    assert t1["status"] == "WAITING"
    assert t1["position"] == 1
    assert t1["token_number"] == "T-001"

    t2 = TokenService.create_token(
        mock_db, m["id"], q["id"], {"customer_name": "Bob"}
    )
    assert t2["position"] == 2
    assert t2["token_number"] == "T-002"

    stats = TokenService.token_stats(mock_db, m["id"], q["id"])
    assert stats["TOTAL"] == 2
    assert stats["WAITING"] == 2
    assert stats["SERVING"] == 0
    assert stats["COMPLETED"] == 0
    assert stats["CANCELLED"] == 0


def test_token_listing_and_filtering(mock_db):
    m = AuthService.register_manager(
        mock_db, {"name": "Manager", "email": "tok_list@test.com", "password": "pass"}
    )
    q = QueueService.create_queue(
        mock_db, m["id"], {"name": "Support", "code": "SUP"}
    )

    t1 = TokenService.create_token(mock_db, m["id"], q["id"], {"customer_name": "Alice"})
    t2 = TokenService.create_token(mock_db, m["id"], q["id"], {"customer_name": "Bob"})
    t3 = TokenService.create_token(mock_db, m["id"], q["id"], {"customer_name": "Charlie"})

    # List all
    all_tokens = TokenService.list_tokens(mock_db, m["id"], q["id"])
    assert len(all_tokens) == 3

    # Search by name
    search_bob = TokenService.list_tokens(mock_db, m["id"], q["id"], search="Bob")
    assert len(search_bob) == 1
    assert search_bob[0]["customer_name"] == "Bob"

    # Search by token number
    search_t1 = TokenService.list_tokens(mock_db, m["id"], q["id"], search="T-001")
    assert len(search_t1) == 1
    assert search_t1[0]["customer_name"] == "Alice"

    # Filter by status
    waiting = TokenService.list_tokens(mock_db, m["id"], q["id"], status="WAITING")
    assert len(waiting) == 3
    serving = TokenService.list_tokens(mock_db, m["id"], q["id"], status="SERVING")
    assert len(serving) == 0


def test_token_move_boundary_and_validation(mock_db):
    m = AuthService.register_manager(
        mock_db, {"name": "Manager", "email": "tok_move@test.com", "password": "pass"}
    )
    q = QueueService.create_queue(
        mock_db, m["id"], {"name": "General", "code": "GEN"}
    )

    t1 = TokenService.create_token(mock_db, m["id"], q["id"], {"customer_name": "Alice"})
    t2 = TokenService.create_token(mock_db, m["id"], q["id"], {"customer_name": "Bob"})

    # Moving top token UP keeps position at 1 (no-op boundary)
    moved_t1 = TokenService.move_token(mock_db, m["id"], t1["id"], "UP")
    assert moved_t1["position"] == 1

    # Moving bottom token DOWN keeps position at 2 (no-op boundary)
    moved_t2 = TokenService.move_token(mock_db, m["id"], t2["id"], "DOWN")
    assert moved_t2["position"] == 2

    # Moving Bob UP swaps Alice and Bob
    bob_up = TokenService.move_token(mock_db, m["id"], t2["id"], "UP")
    assert bob_up["position"] == 1
    alice_refreshed = TokenService.get_token(mock_db, m["id"], t1["id"])
    assert alice_refreshed["position"] == 2

    # Invalid direction raises ValueError
    with pytest.raises(ValueError):
        TokenService.move_token(mock_db, m["id"], t1["id"], "SIDEWAYS")


def test_inactive_queue_restrictions(mock_db):
    m = AuthService.register_manager(
        mock_db, {"name": "Manager", "email": "tok_inact@test.com", "password": "pass"}
    )
    q = QueueService.create_queue(
        mock_db, m["id"], {"name": "Desk", "code": "DSK", "status": "INACTIVE"}
    )

    # Creating token on inactive queue must fail
    with pytest.raises(ValueError, match="inactive queue"):
        TokenService.create_token(mock_db, m["id"], q["id"], {"customer_name": "Alice"})

    # Call next on inactive queue must fail
    with pytest.raises(ValueError, match="inactive queue"):
        TokenService.call_next(mock_db, m["id"], q["id"])


def test_invalid_ids_and_cross_manager_access(mock_db):
    m1 = AuthService.register_manager(
        mock_db, {"name": "M1", "email": "m1_sec@test.com", "password": "pass"}
    )
    m2 = AuthService.register_manager(
        mock_db, {"name": "M2", "email": "m2_sec@test.com", "password": "pass"}
    )
    q1 = QueueService.create_queue(mock_db, m1["id"], {"name": "Q1", "code": "Q1"})
    t1 = TokenService.create_token(mock_db, m1["id"], q1["id"], {"customer_name": "Alice"})

    # Invalid ObjectId format
    with pytest.raises(ValueError):
        TokenService.get_token(mock_db, m1["id"], "invalid-id")

    # M2 cannot access or mutate M1's token
    assert TokenService.get_token(mock_db, m2["id"], t1["id"]) is None

    with pytest.raises(ValueError):
        TokenService.move_token(mock_db, m2["id"], t1["id"], "DOWN")

    with pytest.raises(ValueError):
        TokenService.cancel_token(mock_db, m2["id"], t1["id"])

    with pytest.raises(ValueError):
        TokenService.call_next(mock_db, m2["id"], q1["id"])

    with pytest.raises(ValueError):
        TokenService.complete_token(mock_db, m2["id"], t1["id"])
