"""
DRAPE Error Handling Middleware.

Maps domain exceptions and unhandled application errors into RFC 9457
(superseding RFC 7807) Problem Details for HTTP APIs.
Conforms to SYSTEM_ARCHITECTURE.md §8.3.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import logger


def setup_exception_handlers(app: FastAPI) -> None:
    """Registers global exception handlers on the FastAPI app."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        """Formats standard HTTP exceptions as RFC 9457 Problem Details."""
        return JSONResponse(
            status_code=exc.status_code,
            media_type="application/problem+json",
            content={
                "type": f"https://api.drape.fashion/errors/http-{exc.status_code}",
                "title": exc.detail if isinstance(exc.detail, str) else "HTTP Error",
                "status": exc.status_code,
                "detail": str(exc.detail),
                "instance": request.url.path,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Formats 422 request validation errors as RFC 9457 Problem Details."""
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            media_type="application/problem+json",
            content={
                "type": "https://api.drape.fashion/errors/validation-error",
                "title": "Request Validation Failed",
                "status": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "detail": "One or more request parameters or payload fields failed schema validation.",
                "instance": request.url.path,
                "invalid_params": [
                    {
                        "loc": list(err.get("loc", [])),
                        "msg": err.get("msg", ""),
                        "type": err.get("type", ""),
                    }
                    for err in exc.errors()
                ],
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Catches unexpected exceptions, logs trace, and sanitizes output."""
        logger.error(
            "Unhandled server exception intercepted",
            exc_info=exc,
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="application/problem+json",
            content={
                "type": "https://api.drape.fashion/errors/internal-server-error",
                "title": "Internal Server Error",
                "status": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "detail": "An unexpected internal server error occurred. This incident has been logged.",
                "instance": request.url.path,
            },
        )

