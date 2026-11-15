"""
Authentication service handling registration, login, and session management.
"""

import logging
from typing import Dict, Any

from fastapi import HTTPException, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from models.user_model import UserModel
from utils.security import hash_password, verify_password, create_access_token

logger = logging.getLogger("queueflow.services.auth")


class AuthService:
    """Service responsible for manager authentication operations."""

    @staticmethod
    def register_manager(db: Database, data: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new manager.

        Normalizes email and name, checks for duplicates, creates user.
        Returns a safe user dict (no password hash).
        """
        password_hash = hash_password(data["password"])
        normalized_email = data["email"].strip().lower()
        normalized_name = data["name"].strip()
        user_data = {
            "name": normalized_name,
            "email": normalized_email,
            "password_hash": password_hash,
        }
        # Pre‑check for existing email
        if UserModel.find_by_email(db, normalized_email):
            logger.warning(f"Registration failed: duplicate email {normalized_email}")
            raise ValueError("An account with this email address already exists.")
        try:
            created_user = UserModel.create_user(db, user_data)
            logger.info(f"Manager registered successfully: {normalized_email}")
            return created_user
        except DuplicateKeyError:
            logger.warning(f"Registration failed (DB duplicate): {normalized_email}")
            raise ValueError("An account with this email address already exists.")
        except Exception as exc:
            logger.error(f"Unexpected error during registration: {exc}")
            raise

    @staticmethod
    def login_manager(db: Database, data: Dict[str, Any]) -> Dict[str, Any]:
        """Authenticate manager and return JWT token along with user info.

        The returned dict includes ``access_token``, ``token_type`` and a nested ``user``
        representation matching ``UserResponse``. Extra fields are ignored by FastAPI's
        ``response_model`` (TokenResponse) but are required for internal service usage
        and tests.
        """
        user = UserModel.find_by_email(db, data["email"].strip().lower())
        credentials_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        if not user:
            logger.info(f"Login attempt for non‑existent email: {data['email']}")
            raise credentials_error
        if not verify_password(data["password"], user["password_hash"]):
            logger.info(f"Login attempt with wrong password: {data['email']}")
            raise credentials_error
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated. Contact your administrator.",
            )
        access_token = create_access_token(data={"sub": str(user["_id"])} )
        logger.info(f"Manager logged in: {data['email']}")
        # Serialize user for the response (exclude password hash)
        user_serialized = UserModel._serialize_user(user)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_serialized,
        }
    @staticmethod
    def get_current_manager(db: Database, user_id: str) -> Dict[str, Any]:
        """Fetch manager profile by user ID. Returns safe user dict."""
        user = UserModel.find_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return UserModel._serialize_user(user)
