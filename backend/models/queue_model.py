"""Queue model and MongoDB operations for QueueFlow.

Implements static‑method style similar to other models.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from bson import ObjectId
from pymongo.database import Database

logger = logging.getLogger("queueflow.models.queue")


class QueueModel:
    """Manages queue documents in the ``queues`` MongoDB collection.

    Methods receive a ``Database`` instance (FastAPI dependency ``get_db``) and operate on raw
    MongoDB documents. They raise ``ValueError`` for invalid input and return plain ``dict`` objects
    safe for API exposure.
    """

    COLLECTION_NAME = "queues"
    VALID_STATUSES = {"ACTIVE", "INACTIVE"}

    @staticmethod
    def ensure_indexes(db: Database) -> None:
        """Create indexes needed for queue queries.

        - ``manager_id`` – fast lookup of a manager's queues.
        - ``status`` – filter by ``ACTIVE``/``INACTIVE``.
        - ``name``/``description`` text index – simple search.
        """
        if db is None:
            logger.warning("Cannot create queue indexes: database is None")
            return
        try:
            coll = db[QueueModel.COLLECTION_NAME]
            coll.create_index("manager_id")
            coll.create_index("status")
            coll.create_index([("name", "text"), ("description", "text")])
            logger.info("Queue collection indexes ensured")
        except Exception as e:
            logger.error(f"Failed to create queue indexes: {e}")

    @staticmethod
    def _serialize(queue_doc: Dict) -> Dict:
        """Convert a raw MongoDB document to a clean dict for API responses."""
        return {
            "id": str(queue_doc.get("_id")),
            "name": queue_doc.get("name"),
            "description": queue_doc.get("description"),
            "code": queue_doc.get("code"),
            "manager_id": str(queue_doc.get("manager_id")),
            "status": queue_doc.get("status"),
            "created_at": queue_doc.get("created_at"),
            "updated_at": queue_doc.get("updated_at"),
        }

    @staticmethod
    def create(db: Database, manager_id: str, data: Dict) -> Dict:
        """Insert a new queue.

        ``data`` must contain ``name`` and ``description``. Optional ``code`` can be provided.
        ``status`` defaults to ``ACTIVE``. ``manager_id`` is taken from the JWT.
        """
        now = datetime.now(timezone.utc).isoformat()
        document = {
            "name": data["name"].strip(),
            "description": data.get("description", "").strip(),
            "code": data.get("code", "").strip().upper(),
            "manager_id": ObjectId(manager_id),
            "status": data.get("status", "ACTIVE").upper(),
            "created_at": now,
            "updated_at": now,
        }
        if document["status"] not in QueueModel.VALID_STATUSES:
            raise ValueError("Invalid status value")
        coll = db[QueueModel.COLLECTION_NAME]
        result = coll.insert_one(document)
        document["_id"] = result.inserted_id
        logger.info(f"Queue created: {document['_id']} for manager {manager_id}")
        return QueueModel._serialize(document)

    @staticmethod
    def list(db: Database, manager_id: str, skip: int = 0, limit: int = 20, search: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        """Return a paginated list of queues belonging to ``manager_id``.

        ``search`` performs a simple text search on ``name`` and ``description``.
        ``status`` filters by ``ACTIVE``/``INACTIVE``.
        """
        coll = db[QueueModel.COLLECTION_NAME]
        query: Dict = {"manager_id": ObjectId(manager_id)}
        if status:
            query["status"] = status.upper()
        if search:
            query["$text"] = {"$search": search}
        cursor = coll.find(query).skip(skip).limit(limit).sort("created_at", -1)
        return [QueueModel._serialize(doc) for doc in cursor]

    @staticmethod
    def get(db: Database, manager_id: str, queue_id: str) -> Optional[Dict]:
        """Retrieve a single queue belonging to the manager.

        Returns ``None`` if not found or not owned.
        """
        coll = db[QueueModel.COLLECTION_NAME]
        try:
            doc = coll.find_one({"_id": ObjectId(queue_id), "manager_id": ObjectId(manager_id)})
            return QueueModel._serialize(doc) if doc else None
        except Exception:
            return None

    @staticmethod
    def update(db: Database, manager_id: str, queue_id: str, data: Dict) -> Optional[Dict]:
        """Replace ``name`` and ``description`` of a queue.

        ``status`` is not changed here – use the dedicated status endpoint.
        """
        coll = db[QueueModel.COLLECTION_NAME]
        update_fields = {
            "name": data["name"].strip(),
            "description": data.get("description", "").strip(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            result = coll.update_one({"_id": ObjectId(queue_id), "manager_id": ObjectId(manager_id)}, {"$set": update_fields})
            if result.matched_count == 0:
                return None
            doc = coll.find_one({"_id": ObjectId(queue_id)})
            return QueueModel._serialize(doc)
        except Exception:
            return None

    @staticmethod
    def set_status(db: Database, manager_id: str, queue_id: str, status: str) -> Optional[Dict]:
        """Toggle a queue's ``status`` between ``ACTIVE`` and ``INACTIVE``.

        Returns the updated queue or ``None`` if not found/unauthorized.
        """
        status = status.upper()
        if status not in QueueModel.VALID_STATUSES:
            raise ValueError("Invalid status value")
        coll = db[QueueModel.COLLECTION_NAME]
        try:
            result = coll.update_one({"_id": ObjectId(queue_id), "manager_id": ObjectId(manager_id)}, {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}})
            if result.matched_count == 0:
                return None
            doc = coll.find_one({"_id": ObjectId(queue_id)})
            return QueueModel._serialize(doc)
        except Exception:
            return None
