"""
Token model and MongoDB operations for QueueFlow.
Handles token creation, numbering, position management, safe updates, and statistics.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database

logger = logging.getLogger("queueflow.models.token")


class TokenModel:
    COLLECTION_NAME = "tokens"
    COUNTERS_COLLECTION = "counters"
    VALID_STATUSES = {"WAITING", "SERVING", "COMPLETED", "CANCELLED"}

    @staticmethod
    def ensure_indexes(db: Database) -> None:
        """Create required indexes for token operations."""
        if db is None:
            logger.warning("Database not available – cannot create token indexes.")
            return
        try:
            coll = db[TokenModel.COLLECTION_NAME]
            coll.create_index([("queue_id", 1)])
            coll.create_index([("manager_id", 1)])
            coll.create_index([("status", 1)])
            coll.create_index([("position", 1)])
            coll.create_index([("queue_id", 1), ("token_number", 1)], unique=True)
            logger.info("Token collection indexes ensured.")
        except Exception as e:
            logger.error(f"Failed to create token indexes: {e}")

    @staticmethod
    def _serialize(token_doc: Dict) -> Optional[Dict]:
        """Convert raw MongoDB token document to a safe dict for API response."""
        if not token_doc:
            return None
        return {
            "id": str(token_doc.get("_id")),
            "token_number": token_doc.get("token_number"),
            "queue_id": str(token_doc.get("queue_id")),
            "manager_id": str(token_doc.get("manager_id")),
            "customer_name": token_doc.get("customer_name"),
            "customer_phone": token_doc.get("customer_phone"),
            "status": token_doc.get("status"),
            "position": token_doc.get("position"),
            "created_at": token_doc.get("created_at"),
            "updated_at": token_doc.get("updated_at"),
            "called_at": token_doc.get("called_at"),
            "completed_at": token_doc.get("completed_at"),
            "cancelled_at": token_doc.get("cancelled_at"),
        }

    @staticmethod
    def _next_sequence(db: Database, queue_id: str) -> int:
        """Atomically increment and return the next token sequence for a queue."""
        counters = db[TokenModel.COUNTERS_COLLECTION]
        result = counters.find_one_and_update(
            {"_id": f"queue_{queue_id}"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return result.get("seq", 1)

    @staticmethod
    def create(
        db: Database,
        manager_id: str,
        queue_id: str,
        customer_name: str,
        customer_phone: Optional[str] = None,
    ) -> Dict:
        """Create a new token in an ACTIVE queue."""
        now = datetime.now(timezone.utc).isoformat()
        from models.queue_model import QueueModel
        queue = QueueModel.get(db, manager_id, queue_id)
        if not queue:
            raise ValueError("Queue not found or not owned by manager")
        if queue["status"] != "ACTIVE":
            raise ValueError("Cannot add token to an inactive queue")

        seq = TokenModel._next_sequence(db, queue_id)
        token_number = f"T-{seq:03d}"

        coll = db[TokenModel.COLLECTION_NAME]
        waiting_count = coll.count_documents({"queue_id": ObjectId(queue_id), "status": "WAITING"})
        position = waiting_count + 1

        document = {
            "token_number": token_number,
            "queue_id": ObjectId(queue_id),
            "manager_id": ObjectId(manager_id),
            "customer_name": customer_name.strip(),
            "customer_phone": customer_phone.strip() if customer_phone else None,
            "status": "WAITING",
            "position": position,
            "created_at": now,
            "updated_at": now,
            "called_at": None,
            "completed_at": None,
            "cancelled_at": None,
        }
        result = coll.insert_one(document)
        document["_id"] = result.inserted_id
        logger.info(f"Token created {token_number} for queue {queue_id}")
        return TokenModel._serialize(document)

    @staticmethod
    def list(
        db: Database,
        manager_id: str,
        queue_id: str,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict]:
        coll = db[TokenModel.COLLECTION_NAME]
        query: Dict = {"queue_id": ObjectId(queue_id), "manager_id": ObjectId(manager_id)}
        if status:
            query["status"] = status.upper()
        if search:
            query["$or"] = [
                {"token_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
            ]
        cursor = (
            coll.find(query)
            .sort([("position", 1), ("created_at", 1)])
            .skip(skip)
            .limit(limit)
        )
        return [TokenModel._serialize(doc) for doc in cursor]

    @staticmethod
    def get(db: Database, manager_id: str, token_id: str) -> Optional[Dict]:
        coll = db[TokenModel.COLLECTION_NAME]
        try:
            doc = coll.find_one({"_id": ObjectId(token_id), "manager_id": ObjectId(manager_id)})
            return TokenModel._serialize(doc) if doc else None
        except Exception:
            return None

    @staticmethod
    def move(db: Database, manager_id: str, token_id: str, direction: str) -> Optional[Dict]:
        """Move a WAITING token up or down one position."""
        direction = direction.upper()
        if direction not in {"UP", "DOWN"}:
            raise ValueError("Invalid direction; must be UP or DOWN")
        coll = db[TokenModel.COLLECTION_NAME]
        token = coll.find_one({"_id": ObjectId(token_id), "manager_id": ObjectId(manager_id)})
        if not token:
            return None
        if token.get("status") != "WAITING":
            raise ValueError("Only WAITING tokens can be moved")
        current_pos = token.get("position")
        target_pos = current_pos - 1 if direction == "UP" else current_pos + 1
        if target_pos < 1:
            return TokenModel._serialize(token)

        adjacent = coll.find_one(
            {
                "queue_id": token["queue_id"],
                "status": "WAITING",
                "position": target_pos,
            }
        )
        if not adjacent:
            return TokenModel._serialize(token)

        now = datetime.now(timezone.utc).isoformat()
        coll.update_one({"_id": token["_id"]}, {"$set": {"position": target_pos, "updated_at": now}})
        coll.update_one({"_id": adjacent["_id"]}, {"$set": {"position": current_pos, "updated_at": now}})
        updated = coll.find_one({"_id": token["_id"]})
        return TokenModel._serialize(updated)

    @staticmethod
    def cancel(db: Database, manager_id: str, token_id: str) -> Optional[Dict]:
        """Cancel a WAITING token and renumber remaining waiting positions."""
        coll = db[TokenModel.COLLECTION_NAME]
        token = coll.find_one({"_id": ObjectId(token_id), "manager_id": ObjectId(manager_id)})
        if not token:
            return None
        if token.get("status") != "WAITING":
            raise ValueError("Only WAITING tokens can be cancelled")
        pos = token.get("position")
        now = datetime.now(timezone.utc).isoformat()

        coll.update_one(
            {"_id": token["_id"]},
            {
                "$set": {
                    "status": "CANCELLED",
                    "position": None,
                    "cancelled_at": now,
                    "updated_at": now,
                },
            },
        )
        if pos is not None:
            coll.update_many(
                {"queue_id": token["queue_id"], "status": "WAITING", "position": {"$gt": pos}},
                {"$inc": {"position": -1}, "$set": {"updated_at": now}},
            )
        updated = coll.find_one({"_id": token["_id"]})
        return TokenModel._serialize(updated)

    @staticmethod
    def call_next(db: Database, manager_id: str, queue_id: str) -> Optional[Dict]:
        """Promote the first WAITING token to SERVING.
        Guarantees only one SERVING token per queue.
        If an orphaned SERVING token exists (one that belongs to a different
        manager or is otherwise dangling), it is auto-completed so the queue
        is not permanently blocked.
        """
        coll = db[TokenModel.COLLECTION_NAME]
        queue_oid = ObjectId(queue_id)
        manager_oid = ObjectId(manager_id)

        # Check for any token currently in SERVING status for this queue
        existing_serving = coll.find_one({"queue_id": queue_oid, "status": "SERVING"})
        if existing_serving:
            # If the serving token belongs to this manager, block normally
            if existing_serving.get("manager_id") == manager_oid:
                raise ValueError("Another customer is currently being served in this queue. Complete service before calling next.")
            else:
                # Orphaned serving token from a different manager or dangling state –
                # auto-complete it so the queue is not permanently blocked.
                now = datetime.now(timezone.utc).isoformat()
                logger.warning(
                    f"Auto-completing orphaned SERVING token {existing_serving['_id']} "
                    f"in queue {queue_id} (belonged to manager {existing_serving.get('manager_id')})"
                )
                coll.update_one(
                    {"_id": existing_serving["_id"]},
                    {"$set": {"status": "COMPLETED", "completed_at": now, "updated_at": now}},
                )

        token = coll.find_one(
            {"queue_id": queue_oid, "manager_id": manager_oid, "status": "WAITING"},
            sort=[("position", 1)],
        )
        if not token:
            return None
        position = token.get("position")
        now = datetime.now(timezone.utc).isoformat()

        coll.update_one(
            {"_id": token["_id"]},
            {
                "$set": {"status": "SERVING", "position": None, "called_at": now, "updated_at": now},
            },
        )
        if position is not None:
            coll.update_many(
                {"queue_id": queue_oid, "status": "WAITING", "position": {"$gt": position}},
                {"$inc": {"position": -1}, "$set": {"updated_at": now}},
            )
        updated = coll.find_one({"_id": token["_id"]})
        return TokenModel._serialize(updated)

    @staticmethod
    def complete(db: Database, manager_id: str, token_id: str) -> Optional[Dict]:
        """Complete service for a currently SERVING token.
        Waiting positions remain untouched.
        """
        coll = db[TokenModel.COLLECTION_NAME]
        now = datetime.now(timezone.utc).isoformat()
        result = coll.find_one_and_update(
            {
                "_id": ObjectId(token_id),
                "manager_id": ObjectId(manager_id),
                "status": "SERVING",
            },
            {
                "$set": {
                    "status": "COMPLETED",
                    "completed_at": now,
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        return TokenModel._serialize(result) if result else None

    @staticmethod
    def statistics(db: Database, manager_id: str, queue_id: str) -> Dict:
        """Return aggregated token counts for a queue."""
        coll = db[TokenModel.COLLECTION_NAME]
        pipeline = [
            {"$match": {"queue_id": ObjectId(queue_id), "manager_id": ObjectId(manager_id)}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        agg = list(coll.aggregate(pipeline))
        stats = {"TOTAL": 0, "WAITING": 0, "SERVING": 0, "COMPLETED": 0, "CANCELLED": 0}
        for entry in agg:
            status_key = entry["_id"]
            count = entry["count"]
            stats[status_key] = count
            stats["TOTAL"] += count
        return stats

    @staticmethod
    def can_delete(db: Database, token_id: str) -> bool:
        return True

    @staticmethod
    def delete(db: Database, manager_id: str, token_id: str) -> bool:
        coll = db[TokenModel.COLLECTION_NAME]
        result = coll.delete_one({"_id": ObjectId(token_id), "manager_id": ObjectId(manager_id)})
        return result.deleted_count == 1
