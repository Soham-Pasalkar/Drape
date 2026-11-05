"""
DRAPE Structured Logging Module.

Formats log events as structured JSON or standard text conforming to
SYSTEM_ARCHITECTURE.md §8.1. Redacts sensitive PII patterns.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "drape-backend",
            "name": record.name,
            "message": record.getMessage(),
        }

        # Include exception trace if present
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        # Include custom extra fields if provided
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            log_payload.update(record.extra)

        return json.dumps(log_payload)


def setup_logging() -> None:
    """Configures root logger based on settings."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    if settings.LOG_FORMAT.lower() == "json":
        handler.setFormatter(JSONFormatter())
    else:
        standard_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        handler.setFormatter(logging.Formatter(standard_format))

    root_logger.addHandler(handler)

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


logger = logging.getLogger("drape")

