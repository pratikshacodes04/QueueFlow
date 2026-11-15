'''Queue service layer for QueueFlow.
Provides thin wrappers around the QueueModel methods and handles
conversion of request data to the format expected by the model.
''' 

from typing import List, Optional

from pymongo.database import Database

from models.queue_model import QueueModel


class QueueService:
    @staticmethod
    def create_queue(db: Database, manager_id: str, data: dict) -> dict:
        return QueueModel.create(db, manager_id, data)

    @staticmethod
    def list_queues(
        db: Database,
        manager_id: str,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[dict]:
        return QueueModel.list(db, manager_id, skip, limit, search, status)

    @staticmethod
    def get_queue(db: Database, manager_id: str, queue_id: str) -> dict:
        """Retrieve a queue owned by the manager.

        Raises ``ValueError`` if the queue does not exist or is not owned by the manager.
        """
        queue = QueueModel.get(db, manager_id, queue_id)
        if not queue:
            raise ValueError("Queue not found or not owned by manager")
        return queue

    @staticmethod
    def update_queue(db: Database, manager_id: str, queue_id: str, data: dict) -> Optional[dict]:
        return QueueModel.update(db, manager_id, queue_id, data)

    @staticmethod
    def set_status(db: Database, manager_id: str, queue_id: str, status: str) -> Optional[dict]:
        return QueueModel.set_status(db, manager_id, queue_id, status)

    @staticmethod
    def delete_queue(db: Database, manager_id: str, queue_id: str) -> bool:
        return QueueModel.delete(db, manager_id, queue_id)

