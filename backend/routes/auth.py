"""
Authentication routes for QueueFlow manager registration, login, and profile.
"""

from fastapi import APIRouter, Depends
from pymongo.database import Database

from config.database import get_db
from controllers.auth_controller import AuthController
from schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    RegisterResponse,
)
from utils.auth_dependencies import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=201,
    summary="Register a new manager",
)
def register(data: RegisterRequest, db: Database = Depends(get_db)):
    """
    Create a new manager account.
    Validates input, hashes password, and stores user in MongoDB.
    Returns 201 on success, 409 if email already registered, 422 for validation errors.
    """
    return AuthController.register(data, db)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate manager",
)
def login(data: LoginRequest, db: Database = Depends(get_db)):
    """
    Authenticate with email and password.
    Returns a signed JWT access token on success.
    Returns 401 for invalid credentials. Does not reveal whether the email exists.
    """
    return AuthController.login(data, db)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current manager profile",
)
def get_me(current_user: dict = Depends(get_current_active_user)):
    """
    Return the profile of the currently authenticated manager.
    Requires a valid JWT in the Authorization header.
    Returns 401 if unauthenticated, 403 if account is inactive.
    """
    return AuthController.me(current_user)

