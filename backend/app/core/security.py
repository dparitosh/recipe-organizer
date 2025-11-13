from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.core.config import settings

API_KEY_HEADER_NAME = "X-API-Key"
ADMIN_API_KEY_HEADER_NAME = "X-Admin-API-Key"

_api_key_header = APIKeyHeader(name=API_KEY_HEADER_NAME, auto_error=False)
_admin_api_key_header = APIKeyHeader(name=ADMIN_API_KEY_HEADER_NAME, auto_error=False)


def _ensure_configured(expected_key: str | None) -> str:
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key security is not configured on the server",
        )
    return expected_key


def _validate_key(provided: Optional[str], expected: str) -> str:
    if not provided or provided != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return expected


async def require_api_key(api_key: Optional[str] = Security(_api_key_header)) -> str:
    """Validate the primary API key presented in the request."""

    expected = _ensure_configured(settings.API_KEY)
    return _validate_key(api_key, expected)


async def require_admin_api_key(
    admin_key: Optional[str] = Security(_admin_api_key_header),
    fallback_key: Optional[str] = Security(_api_key_header),
) -> str:
    """Validate admin-level API access.

    Falls back to the primary API key if a dedicated admin key is not configured.
    """

    expected_admin_key = settings.ADMIN_API_KEY or settings.API_KEY
    expected = _ensure_configured(expected_admin_key)
    supplied = admin_key or fallback_key
    return _validate_key(supplied, expected)
