"""
Pydantic schemas for Queue objects used in the QueueFlow API.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, validator


class QueueBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field("ACTIVE")

    @validator("status")
    def validate_status(cls, v):
        if v.upper() not in {"ACTIVE", "INACTIVE"}:
            raise ValueError("status must be 'ACTIVE' or 'INACTIVE'")
        return v.upper()


class QueueCreate(QueueBase):
    pass


class QueueUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    @validator("name")
    def strip_name(cls, v):
        return v.strip() if isinstance(v, str) else v

    @validator("description")
    def strip_desc(cls, v):
        return v.strip() if isinstance(v, str) else v


class QueueStatusUpdate(BaseModel):
    status: str

    @validator("status")
    def validate_status(cls, v):
        if v.upper() not in {"ACTIVE", "INACTIVE"}:
            raise ValueError("status must be 'ACTIVE' or 'INACTIVE'")
        return v.upper()


class QueueOut(QueueBase):
    id: str
    manager_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

