import logging
import time
from typing import Optional, Dict, Any
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from config.settings import get_settings

logger = logging.getLogger("queueflow.database")


class DatabaseManager:
    """
    Singleton database manager managing the PyMongo client lifecycle.
    Provides reusable connection pooling and error-safe connectivity checks.
    """

    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    @classmethod
    def connect(cls) -> Optional[Database]:
        """Establish connection to MongoDB client and select default database."""
        settings = get_settings()
        if cls._client is None:
            try:
                logger.info("Connecting to MongoDB at configured URI...")
                cls._client = MongoClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS,
                    connectTimeoutMS=settings.MONGODB_TIMEOUT_MS,
                )
                cls._db = cls._client[settings.MONGODB_DB_NAME]
                logger.info(
                    f"MongoDB connection initialized for database '{settings.MONGODB_DB_NAME}'."
                )
            except Exception as e:
                logger.error(f"Failed to initialize MongoDB client: {str(e)}")
                cls._client = None
                cls._db = None
                raise
        return cls._db

    @classmethod
    def disconnect(cls) -> None:
        """Close active MongoDB client connection gracefully."""
        if cls._client is not None:
            logger.info("Closing MongoDB client connection...")
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("MongoDB client connection closed.")

    @classmethod
    def get_database(cls) -> Optional[Database]:
        """Get the active database instance, connecting if needed."""
        if cls._db is None:
            cls.connect()
        return cls._db

    @classmethod
    def check_health(cls) -> Dict[str, Any]:
        """
        Check database connectivity with a ping command.
        Returns detailed health dictionary with latency or error description.
        """
        settings = get_settings()
        if cls._client is None:
            try:
                cls.connect()
            except Exception as exc:
                return {
                    "connected": False,
                    "database": settings.MONGODB_DB_NAME,
                    "error": str(exc),
                    "latency_ms": None,
                }

        start_time = time.time()
        try:
            # Send a ping command to verify connection
            cls._client.admin.command("ping")
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "connected": True,
                "database": settings.MONGODB_DB_NAME,
                "error": None,
                "latency_ms": latency_ms,
            }
        except (ConnectionFailure, ServerSelectionTimeoutError) as err:
            logger.warning(f"MongoDB ping failed: {str(err)}")
            return {
                "connected": False,
                "database": settings.MONGODB_DB_NAME,
                "error": f"Connection failed: {str(err)}",
                "latency_ms": None,
            }
        except Exception as err:
            logger.error(f"Unexpected error during MongoDB ping: {str(err)}")
            return {
                "connected": False,
                "database": settings.MONGODB_DB_NAME,
                "error": str(err),
                "latency_ms": None,
            }


def get_db() -> Optional[Database]:
    """Dependency helper to get the database instance."""
    return DatabaseManager.get_database()

