"""
FastAPI authentication dependencies for protected endpoints.
"""

import logging
from typing import Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config.database import get_db
from models.user_model import UserModel
from utils.security import decode_access_token

logger = logging.getLogger("queueflow.auth")

# OAuth2 scheme — clients send token in "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
) -> Dict[str, Any]:
    """
    Dependency that extracts and validates the JWT from the Authorization header.
    Returns the authenticated user dict (without password_hash).
    Raises HTTP 401 if token is missing, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = UserModel.find_by_id(db, user_id)
    if user is None:
        raise credentials_exception

    return UserModel._serialize_user(user)


async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Dependency that ensures the authenticated user account is active.
    Raises HTTP 403 if the account has been deactivated.
    """
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact your administrator.",
        )
    return current_user

