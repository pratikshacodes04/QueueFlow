"""
Pydantic request and response schemas for QueueFlow authentication.
"""

import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    """Schema for manager registration request."""

    name: str = Field(
        ..., min_length=2, max_length=100, description="Manager full name"
    )
    email: str = Field(..., description="Manager email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password")
    confirm_password: str = Field(..., description="Password confirmation")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, v.strip()):
            raise ValueError("Invalid email address format")
        return v.strip().lower()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip()

    @field_validator("confirm_password")
    @classmethod
    def passwords_must_match(cls, v, info):
        password = info.data.get("password")
        if password is not None and v != password:
            raise ValueError("Passwords do not match")
        return v


class LoginRequest(BaseModel):
    """Schema for manager login request."""

    email: str = Field(..., description="Manager email address")
    password: str = Field(..., description="Password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        return v.strip().lower()


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class UserResponse(BaseModel):
    """Schema for user data response. Never includes password_hash."""

    id: str = Field(..., description="User unique identifier")
    name: str = Field(..., description="Manager full name")
    email: str = Field(..., description="Manager email address")
    is_active: bool = Field(..., description="Account active status")
    created_at: Optional[str] = Field(None, description="Account creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "64f1a2b3c4d5e6f7a8b9c0d1",
                "name": "Alex Morgan",
                "email": "alex@queueflow.io",
                "is_active": True,
                "created_at": "2026-11-13T10:30:00Z",
            }
        }


class RegisterResponse(BaseModel):
    """Schema for successful registration response."""

    message: str = Field(..., description="Success message")
    user: UserResponse = Field(..., description="Created user data")

