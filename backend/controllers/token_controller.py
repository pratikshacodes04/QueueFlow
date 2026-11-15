"""Token controller – FastAPI endpoints for token operations.

All routes depend on `get_current_active_user` for JWT authentication and use
`TokenService` for business logic. Errors from the service are translated to
appropriate HTTP responses.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from typing import List, Optional

from schemas.token import (
    TokenCreate,
    TokenOut,
    TokenMove,
    TokenStats,
)
from utils.auth_dependencies import get_current_active_user
from config.database import get_db
from services.token_service import TokenService

router = APIRouter(tags=["Token Management"])


@router.post(
    "/queues/{queue_id}/tokens",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add Customer to Queue",
)
async def create_token(
    queue_id: str,
    payload: TokenCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        token = TokenService.create_token(
            db, current_user["id"], queue_id, payload.dict()
        )
        return token
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create token",
        )


@router.get(
    "/queues/{queue_id}/tokens",
    response_model=List[TokenOut],
    summary="List tokens in Queue",
)
async def list_tokens(
    queue_id: str,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        tokens = TokenService.list_tokens(
            db,
            current_user["id"],
            queue_id,
            skip=skip,
            limit=limit,
            search=search,
            status=status_filter,
        )
        return tokens
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.get(
    "/tokens/{token_id}",
    response_model=TokenOut,
    summary="Get Token by ID",
)
async def get_token(
    token_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    token = TokenService.get_token(db, current_user["id"], token_id)
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    return token


@router.post(
    "/tokens/{token_id}/move",
    response_model=TokenOut,
    summary="Move Token Priority (UP/DOWN)",
)
async def move_token(
    token_id: str,
    payload: TokenMove,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        token = TokenService.move_token(db, current_user["id"], token_id, payload.direction)
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
        return token
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to move token")


@router.patch(
    "/tokens/{token_id}/cancel",
    response_model=TokenOut,
    summary="Cancel Waiting Token",
)
async def cancel_token(
    token_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        token = TokenService.cancel_token(db, current_user["id"], token_id)
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
        return token
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to cancel token")


@router.post(
    "/queues/{queue_id}/tokens/call-next",
    response_model=TokenOut,
    status_code=status.HTTP_200_OK,
    summary="Call Next Waiting Customer",
)
async def call_next_token(
    queue_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        token = TokenService.call_next(db, current_user["id"], queue_id)
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No waiting token in queue")
        return token
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to call next token")


@router.patch(
    "/tokens/{token_id}/complete",
    response_model=TokenOut,
    status_code=status.HTTP_200_OK,
    summary="Complete Service for Token",
)
async def complete_token(
    token_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        token = TokenService.complete_token(db, current_user["id"], token_id)
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
        return token
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to complete service")


@router.get(
    "/queues/{queue_id}/tokens/stats",
    response_model=TokenStats,
    summary="Get Queue Token Statistics",
)
async def token_stats(
    queue_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    try:
        stats = TokenService.token_stats(db, current_user["id"], queue_id)
        return stats
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve stats")
