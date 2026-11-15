"""Pydantic schemas for token operations in QueueFlow.

These schemas are used by the token controller to validate request bodies and
shape responses. They mirror the fields returned by `TokenModel._serialize`.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, validator


class TokenCreate(BaseModel):
    """Payload for creating a new token in a queue."""

    customer_name: str = Field(..., min_length=1, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)

    @validator("customer_phone")
    def strip_phone(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if isinstance(v, str) else v


class TokenMove(BaseModel):
    """Payload for moving a waiting token up or down one position."""

    direction: Literal["UP", "DOWN"]


class TokenOut(BaseModel):
    """Response model that matches the dictionary produced by TokenModel._serialize."""

    id: str
    token_number: str
    queue_id: str
    manager_id: str
    customer_name: str
    customer_phone: Optional[str] = None
    status: str
    position: Optional[int] = None
    created_at: str
    updated_at: str
    called_at: Optional[str] = None
    completed_at: Optional[str] = None
    cancelled_at: Optional[str] = None

    class Config:
        orm_mode = True


class TokenStats(BaseModel):
    """Aggregated token statistics for a queue."""

    TOTAL: int
    WAITING: int
    SERVING: int
    COMPLETED: int
    CANCELLED: int

