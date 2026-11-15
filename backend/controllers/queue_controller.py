'''Queue controller for FastAPI endpoints.
Handles request validation, authentication, and delegates to the
QueueService. All operations are scoped to the authenticated manager.
''' 

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from config.database import get_db
from schemas.queue import (
    QueueCreate,
    QueueUpdate,
    QueueStatusUpdate,
    QueueOut,
)
from utils.auth_dependencies import get_current_active_user
from services.queue_service import QueueService

router = APIRouter(prefix="/queues", tags=["Queue Management"])


@router.post("", response_model=QueueOut, status_code=status.HTTP_201_CREATED)
def create_queue(
    payload: QueueCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        queue = QueueService.create_queue(db, current_user["id"], payload.dict())
        return queue
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create queue")


@router.get("", response_model=list[QueueOut])
def list_queues(
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    status_filter: str | None = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    queues = QueueService.list_queues(
        db,
        current_user["id"],
        skip=skip,
        limit=limit,
        search=search,
        status=status_filter,
    )
    return queues


@router.get("/{queue_id}", response_model=QueueOut)
def get_queue(
    queue_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        queue = QueueService.get_queue(db, current_user["id"], queue_id)
        if not queue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found")
        return queue
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve queue")


@router.put("/{queue_id}", response_model=QueueOut)
def update_queue(
    queue_id: str,
    payload: QueueUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    data = payload.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    queue = QueueService.update_queue(db, current_user["id"], queue_id, data)
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found or not owned")
    return queue


@router.patch("/{queue_id}/status", response_model=QueueOut)
def patch_queue_status(
    queue_id: str,
    payload: QueueStatusUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        queue = QueueService.set_status(db, current_user["id"], queue_id, payload.status)
        if not queue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found or not owned")
        return queue
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.delete("/{queue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_queue(
    queue_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    success = QueueService.delete_queue(db, current_user["id"], queue_id)
    if not success:
        # Could be not found, not owned, or unsafe to delete.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Queue cannot be deleted – it may not exist, you may not own it, or it has active tokens.",
        )
    return None

