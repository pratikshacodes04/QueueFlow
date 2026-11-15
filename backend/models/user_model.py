"""
User model and database operations for QueueFlow managers.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger("queueflow.models.user")


class UserModel:
    """Manages user document operations in the 'users' MongoDB collection."""

    COLLECTION_NAME = "users"

    @staticmethod
    def ensure_indexes(db: Database) -> None:
        """Create required indexes on the users collection."""
        if db is None:
            logger.warning("Cannot create indexes: database is not available.")
            return
        try:
            collection = db[UserModel.COLLECTION_NAME]
            collection.create_index("email", unique=True)
            logger.info("User collection indexes ensured (unique email).")
        except Exception as e:
            logger.error(f"Failed to create user indexes: {str(e)}")

    @staticmethod
    def create_user(db: Database, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a new user document into the database.
        Returns the created user document (without password_hash).
        Raises DuplicateKeyError if email already exists.
        """
        collection = db[UserModel.COLLECTION_NAME]
        now = datetime.now(timezone.utc).isoformat()

        document = {
            "name": user_data["name"],
            "email": user_data["email"].strip().lower(),
            "password_hash": user_data["password_hash"],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        result = collection.insert_one(document)
        document["_id"] = result.inserted_id
        logger.info(f"User created: {document['email']} (ID: {result.inserted_id})")

        # Return without password_hash
        return UserModel._serialize_user(document)

    @staticmethod
    def find_by_email(db: Database, email: str) -> Optional[Dict[str, Any]]:
        """Find a user by normalized email address. Returns raw document with password_hash."""
        collection = db[UserModel.COLLECTION_NAME]
        user = collection.find_one({"email": email.strip().lower()})
        return user

    @staticmethod
    def find_by_id(db: Database, user_id: str) -> Optional[Dict[str, Any]]:
        """Find a user by ObjectId string. Returns raw document with password_hash."""
        collection = db[UserModel.COLLECTION_NAME]
        try:
            user = collection.find_one({"_id": ObjectId(user_id)})
            return user
        except Exception:
            return None

    @staticmethod
    def set_active_status(db: Database, user_id: str, is_active: bool) -> bool:
        """Update user active status. Used for testing and account management."""
        collection = db[UserModel.COLLECTION_NAME]
        try:
            result = collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "is_active": is_active,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )
            return result.modified_count > 0
        except Exception:
            return False

    @staticmethod
    def _serialize_user(user_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a MongoDB user document to a safe dict (no password_hash)."""
        return {
            "id": str(user_doc["_id"]),
            "name": user_doc["name"],
            "email": user_doc["email"],
            "is_active": user_doc.get("is_active", True),
            "created_at": user_doc.get("created_at"),
        }

