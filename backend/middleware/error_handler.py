import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger("queueflow.error_handler")


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle uncaught exceptions globally and return standardized JSON error.

    Returns ``{"detail": "..."}`` format consistent with FastAPI's HTTPException
    so the frontend ``apiRequest`` helper can parse errors uniformly.
    """
    logger.error(
        f"Unhandled exception while processing {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred while processing your request.",
        },
    )

