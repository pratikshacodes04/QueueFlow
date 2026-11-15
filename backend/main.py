from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings
from config.database import DatabaseManager
from routes import api_router
from middleware.error_handler import global_exception_handler
from utils.logger import setup_logger

# Initialize structured logger and runtime settings
logger = setup_logger("queueflow")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initializes database connection on startup and safely disconnects on shutdown.
    """
    logger.info(f"Starting {settings.APP_NAME} [Environment: {settings.APP_ENV}]...")
    try:
        DatabaseManager.connect()
    except Exception as e:
        logger.warning(
            f"Initial MongoDB connection attempt encountered: {str(e)}. "
            "The backend will continue running with degraded database status."
        )
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")
    DatabaseManager.disconnect()


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API foundation for QueueFlow – Smart Queue Management System",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register global error handling middleware
app.add_exception_handler(Exception, global_exception_handler)

# Include all modular API routes
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

