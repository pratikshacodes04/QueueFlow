"""Service layer for token operations.

Provides thin wrappers around `TokenModel` while handling ownership checks,
queue status validation, and ObjectId verification. Single-process concurrency
is serialized per-queue using `get_queue_lock`.
"""

from bson import ObjectId
from bson.errors import InvalidId
from typing import List, Optional, Dict
from pymongo.database import Database

from models.token_model import TokenModel
from models.queue_model import QueueModel
from utils.lock_registry import get_queue_lock


class TokenService:
    @staticmethod
    def _validate_object_id(id_str: str) -> ObjectId:
        try:
            return ObjectId(id_str)
        except InvalidId as exc:
            raise ValueError("Invalid ObjectId format") from exc

    @staticmethod
    def _ensure_manager_owns_queue(db: Database, manager_id: str, queue_id: str) -> None:
        queue_oid = TokenService._validate_object_id(queue_id)
        queue = QueueModel.get(db, manager_id, str(queue_oid))
        if not queue:
            raise ValueError("Queue not found or not owned by manager")
        if queue["status"] != "ACTIVE":
            raise ValueError("Cannot operate on an inactive queue")

    @staticmethod
    def create_token(db: Database, manager_id: str, queue_id: str, payload: dict) -> Dict:
        TokenService._ensure_manager_owns_queue(db, manager_id, queue_id)
        lock = get_queue_lock(queue_id)
        with lock:
            return TokenModel.create(
                db,
                manager_id,
                queue_id,
                payload["customer_name"],
                payload.get("customer_phone"),
            )

    @staticmethod
    def list_tokens(
        db: Database,
        manager_id: str,
        queue_id: str,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict]:
        TokenService._ensure_manager_owns_queue(db, manager_id, queue_id)
        return TokenModel.list(db, manager_id, queue_id, skip, limit, search, status)

    @staticmethod
    def get_token(db: Database, manager_id: str, token_id: str) -> Optional[Dict]:
        token_oid = TokenService._validate_object_id(token_id)
        token = TokenModel.get(db, manager_id, str(token_oid))
        return token

    @staticmethod
    def move_token(db: Database, manager_id: str, token_id: str, direction: str) -> Optional[Dict]:
        token_oid = TokenService._validate_object_id(token_id)
        token = TokenModel.get(db, manager_id, str(token_oid))
        if not token:
            raise ValueError("Token not found or not owned by manager")
        lock = get_queue_lock(str(token["queue_id"]))
        with lock:
            return TokenModel.move(db, manager_id, str(token_oid), direction)

    @staticmethod
    def cancel_token(db: Database, manager_id: str, token_id: str) -> Optional[Dict]:
        token_oid = TokenService._validate_object_id(token_id)
        token = TokenModel.get(db, manager_id, str(token_oid))
        if not token:
            raise ValueError("Token not found or not owned by manager")
        lock = get_queue_lock(str(token["queue_id"]))
        with lock:
            return TokenModel.cancel(db, manager_id, str(token_oid))

    @staticmethod
    def call_next(db: Database, manager_id: str, queue_id: str) -> Optional[Dict]:
        TokenService._ensure_manager_owns_queue(db, manager_id, queue_id)
        lock = get_queue_lock(queue_id)
        with lock:
            return TokenModel.call_next(db, manager_id, queue_id)

    @staticmethod
    def complete_token(db: Database, manager_id: str, token_id: str) -> Optional[Dict]:
        token_oid = TokenService._validate_object_id(token_id)
        token = TokenModel.get(db, manager_id, str(token_oid))
        if not token:
            raise ValueError("Token not found or not owned by manager")
        if token.get("status") != "SERVING":
            raise ValueError("Only SERVING tokens can be marked as COMPLETED")
        lock = get_queue_lock(str(token["queue_id"]))
        with lock:
            # Recheck status inside lock to prevent stale updates
            refreshed = TokenModel.get(db, manager_id, str(token_oid))
            if not refreshed or refreshed.get("status") != "SERVING":
                raise ValueError("Token is no longer in SERVING status")
            return TokenModel.complete(db, manager_id, str(token_oid))

    @staticmethod
    def token_stats(db: Database, manager_id: str, queue_id: str) -> Dict:
        TokenService._ensure_manager_owns_queue(db, manager_id, queue_id)
        return TokenModel.statistics(db, manager_id, queue_id)
