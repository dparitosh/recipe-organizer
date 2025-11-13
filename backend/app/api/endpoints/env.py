import asyncio
import json
import logging
from pathlib import Path
from contextlib import suppress
from typing import Any, Callable, Dict, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from aiohttp import ClientError
from neo4j.exceptions import Neo4jError

from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.neo4j_client import Neo4jClient
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)

router = APIRouter()

ENV_LOCAL_PATH = Path(__file__).resolve().parents[2] / "env.local.json"


class EnvSettingsPayload(BaseModel):
    values: Dict[str, str | int | float | bool] = Field(default_factory=dict)


class EnvSettingsResponse(BaseModel):
    values: Dict[str, str | int | float | bool]


def _validate_non_empty(value: str, field: str) -> None:
    if not value.strip():
        raise ValueError(f"{field} cannot be blank")


def _validate_neo4j_uri(value: str, field: str) -> None:
    if not value:
        return
    allowed_schemes = ("neo4j://", "neo4j+s://", "bolt://", "bolt+s://")
    if not value.startswith(allowed_schemes):
        raise ValueError(f"{field} must begin with neo4j://, neo4j+s://, bolt://, or bolt+s://")


def _validate_http_url(value: str, field: str) -> None:
    if not value:
        return
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field} must be a valid HTTP(S) URL")


ALLOWED_ENV_SETTINGS: Dict[str, Dict[str, Any]] = {
    "NEO4J_URI": {"attr": "NEO4J_URI", "type": str, "validator": _validate_neo4j_uri, "sensitive": False},
    "NEO4J_USER": {"attr": "NEO4J_USER", "type": str, "validator": _validate_non_empty, "sensitive": False},
    "NEO4J_PASSWORD": {"attr": "NEO4J_PASSWORD", "type": str, "validator": _validate_non_empty, "sensitive": True},
    "NEO4J_DATABASE": {"attr": "NEO4J_DATABASE", "type": str, "validator": _validate_non_empty, "sensitive": False},
    "NEO4J_MAX_CONNECTION_POOL_SIZE": {"attr": "NEO4J_MAX_CONNECTION_POOL_SIZE", "type": int, "min": 1, "sensitive": False},
    "NEO4J_MAX_CONNECTION_LIFETIME_SECONDS": {
        "attr": "NEO4J_MAX_CONNECTION_LIFETIME_SECONDS",
        "type": int,
        "min": 0,
        "sensitive": False,
    },
    "NEO4J_CONNECTION_ACQUISITION_TIMEOUT_SECONDS": {
        "attr": "NEO4J_CONNECTION_ACQUISITION_TIMEOUT_SECONDS",
        "type": int,
        "min": 0,
        "sensitive": False,
    },
    "NEO4J_ENCRYPTED": {"attr": "NEO4J_ENCRYPTED", "type": bool, "sensitive": False},
    "OLLAMA_BASE_URL": {"attr": "OLLAMA_BASE_URL", "type": str, "validator": _validate_http_url, "sensitive": False},
    "OLLAMA_MODEL": {"attr": "OLLAMA_MODEL", "type": str, "validator": _validate_non_empty, "sensitive": False},
    "OLLAMA_TIMEOUT": {"attr": "OLLAMA_TIMEOUT", "type": int, "min": 5, "sensitive": False},
    "FDC_API_BASE_URL": {"attr": "FDC_API_BASE_URL", "type": str, "validator": _validate_http_url, "sensitive": False},
    "FDC_API_KEY": {"attr": "FDC_DEFAULT_API_KEY", "type": str, "validator": _validate_non_empty, "sensitive": True},
    "FDC_REQUEST_TIMEOUT": {"attr": "FDC_REQUEST_TIMEOUT", "type": int, "min": 5, "sensitive": False},
    "DEBUG": {"attr": "DEBUG", "type": bool, "sensitive": False},
    "API_KEY": {"attr": "API_KEY", "type": str, "validator": _validate_non_empty, "sensitive": True},
    "ADMIN_API_KEY": {"attr": "ADMIN_API_KEY", "type": str, "validator": _validate_non_empty, "sensitive": True},
    "LOG_DIRECTORY": {"attr": "LOG_DIRECTORY", "type": str, "validator": _validate_non_empty, "sensitive": False},
    "LOG_FILE_NAME": {"attr": "LOG_FILE_NAME", "type": str, "validator": _validate_non_empty, "sensitive": False},
    "LOG_MAX_BYTES": {"attr": "LOG_MAX_BYTES", "type": int, "min": 1024, "sensitive": False},
    "LOG_BACKUP_COUNT": {"attr": "LOG_BACKUP_COUNT", "type": int, "min": 1, "sensitive": False},
}

SENSITIVE_ENV_KEYS = {key for key, meta in ALLOWED_ENV_SETTINGS.items() if meta.get("sensitive")}


def _coerce_value(key: str, value: Any) -> Any:
    meta = ALLOWED_ENV_SETTINGS[key]
    expected_type = meta["type"]

    if value is None:
        return None

    if expected_type is bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "on"}:
                return True
            if normalized in {"false", "0", "no", "off"}:
                return False
        raise ValueError(f"{key} must be a boolean value")

    if expected_type is int:
        try:
            coerced_int = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{key} must be an integer") from exc
        minimum = meta.get("min")
        if minimum is not None and coerced_int < minimum:
            raise ValueError(f"{key} must be at least {minimum}")
        return coerced_int

    coerced_str = str(value).strip()
    validator: Optional[Callable[[str, str], None]] = meta.get("validator")
    if validator:
        validator(coerced_str, key)
    return coerced_str


def _mask_value(key: str, value: Any) -> Any:
    if key in SENSITIVE_ENV_KEYS and value:
        return "********"
    return value


def _load_env_overrides() -> Dict[str, Any]:
    if not ENV_LOCAL_PATH.exists():
        return {}
    try:
        with ENV_LOCAL_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse env.local.json: %s", exc)
        return {}

    overrides: Dict[str, Any] = {}
    for key, value in data.items():
        if key in ALLOWED_ENV_SETTINGS:
            overrides[key] = value
    return overrides


def _build_effective_values() -> Dict[str, Any]:
    values: Dict[str, Any] = {}
    for key, meta in ALLOWED_ENV_SETTINGS.items():
        attr = meta["attr"]
        current_value = getattr(settings, attr, None)
        values[key] = _mask_value(key, current_value)
    return values


def _log_updates(changes: Dict[str, Any], request: Request) -> None:
    redacted = {
        key: ("********" if key in SENSITIVE_ENV_KEYS and value else value)
        for key, value in changes.items()
    }
    client_host = getattr(request.client, "host", "unknown")
    logger.info("Environment overrides updated", extra={"changes": redacted, "client": client_host})


@router.get("", response_model=EnvSettingsResponse)
async def read_env_settings() -> EnvSettingsResponse:
    """Return environment overrides that can be edited from the frontend."""
    return EnvSettingsResponse(values=_build_effective_values())


@router.post("", response_model=EnvSettingsResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.RATE_LIMIT_ENV_WRITE)
async def update_env_settings(payload: EnvSettingsPayload, request: Request) -> EnvSettingsResponse:
    """Persist overrides to env.local.json so the backend picks them up next reload."""
    if not payload.values:
        return await read_env_settings()

    overrides = _load_env_overrides()
    changes: Dict[str, Any] = {}

    for key, raw_value in payload.values.items():
        if key not in ALLOWED_ENV_SETTINGS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot modify {key}")

        if raw_value is None or (isinstance(raw_value, str) and not raw_value.strip()):
            overrides.pop(key, None)
            changes[key] = None
            continue

        try:
            coerced = _coerce_value(key, raw_value)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        overrides[key] = coerced
        changes[key] = coerced

    try:
        ENV_LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with ENV_LOCAL_PATH.open("w", encoding="utf-8") as file:
            json.dump(overrides, file, indent=2)
    except OSError as exc:
        logger.exception("Failed to write env.local.json")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    _log_updates(changes, request)

    # Return the merged view after saving so the UI sees fresh values.
    settings.reload()

    fdc_service = getattr(request.app.state, "fdc_service", None)
    if fdc_service is not None:
        try:
            await fdc_service.update_configuration(
                base_url=settings.FDC_API_BASE_URL,
                timeout=settings.FDC_REQUEST_TIMEOUT,
            )
        except ClientError as exc:  # pragma: no cover - best effort
            logger.warning("Failed to apply new FDC settings: %s", exc)

    neo4j_uri = settings.NEO4J_URI
    neo4j_user = settings.NEO4J_USER
    neo4j_password = settings.NEO4J_PASSWORD

    if neo4j_uri and neo4j_user and neo4j_password:
        try:
            refreshed_client = Neo4jClient(
                uri=neo4j_uri,
                user=neo4j_user,
                password=neo4j_password,
                database=settings.NEO4J_DATABASE,
                max_connection_pool_size=settings.NEO4J_MAX_CONNECTION_POOL_SIZE,
                max_connection_lifetime_seconds=settings.NEO4J_MAX_CONNECTION_LIFETIME_SECONDS,
                connection_acquisition_timeout_seconds=settings.NEO4J_CONNECTION_ACQUISITION_TIMEOUT_SECONDS,
                encrypted=settings.NEO4J_ENCRYPTED,
            )
            refreshed_client.connect()

            existing_client = getattr(request.app.state, "neo4j_client", None)
            if existing_client is not None:
                with suppress(Neo4jError, OSError):  # pragma: no cover - best effort
                    existing_client.close()

            request.app.state.neo4j_client = refreshed_client
        except (Neo4jError, OSError) as exc:  # pragma: no cover - best effort
            logger.warning("Neo4j client refresh failed after settings update: %s", exc)

    ollama_base_url = settings.OLLAMA_BASE_URL
    ollama_model = settings.OLLAMA_MODEL
    ollama_timeout = settings.OLLAMA_TIMEOUT

    if ollama_base_url:
        try:
            refreshed_ollama = OllamaService(
                base_url=ollama_base_url,
                model=ollama_model,
                timeout_seconds=ollama_timeout,
            )
            is_available = await refreshed_ollama.check_health()
            if is_available:
                existing_service = getattr(request.app.state, "ollama_service", None)
                if existing_service is not None:
                    try:
                        await existing_service.close()
                    except (ClientError, RuntimeError):  # pragma: no cover - best effort
                        logger.debug("Failed to close previous OLLAMA service during refresh.")
                request.app.state.ollama_service = refreshed_ollama
            else:
                await refreshed_ollama.close()
                logger.warning("OLLAMA service unavailable after settings update; keeping previous instance.")
        except (ClientError, asyncio.TimeoutError, RuntimeError) as exc:  # pragma: no cover - best effort
            logger.warning("OLLAMA service refresh failed after settings update: %s", exc)

    return await read_env_settings()
