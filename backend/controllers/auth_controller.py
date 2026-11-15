"""
Controller handling authentication requests for QueueFlow managers.
"""

from typing import Dict, Any

from fastapi import status
from fastapi.responses import JSONResponse
from pymongo.database import Database

from services.auth_service import AuthService
from schemas.auth import RegisterRequest, LoginRequest


class AuthController:
    """Controller for registration, login, and profile retrieval."""

    @staticmethod
    def register(data: RegisterRequest, db: Database) -> JSONResponse:
        """Handle manager registration. Returns 201 with created user data."""
        user = AuthService.register_manager(
            db,
            {
                "name": data.name,
                "email": data.email,
                "password": data.password,
            },
        )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "Manager account created successfully.",
                "user": user,
            },
        )

    @staticmethod
    def login(data: LoginRequest, db: Database) -> Dict[str, str]:
        """Handle manager login. Returns JWT token."""
        token_data = AuthService.login_manager(
            db,
            {
                "email": data.email,
                "password": data.password,
            },
        )
        return token_data

    @staticmethod
    def me(current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Return the currently authenticated manager's profile."""
        return current_user

