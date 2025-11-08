import json
import logging
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.db.neo4j_client import Neo4jClient
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)

router = APIRouter()

ENV_LOCAL_PATH = Path(__file__).resolve().parents[2] / "env.local.json"


class EnvSettingsPayload(BaseModel):
    values: Dict[str, str | int | float | bool] = Field(default_factory=dict)


class EnvSettingsResponse(BaseModel):
    values: Dict[str, str | int | float | bool]


@router.get("", response_model=EnvSettingsResponse)
async def read_env_settings() -> EnvSettingsResponse:
    """Return environment overrides that can be edited from the frontend."""
    effective_values: Dict[str, str | int | float | bool] = {
        "NEO4J_URI": settings.NEO4J_URI,
        "NEO4J_USER": settings.NEO4J_USER,
        "NEO4J_PASSWORD": settings.NEO4J_PASSWORD,
        "NEO4J_DATABASE": settings.NEO4J_DATABASE,
        "FDC_API_BASE_URL": settings.FDC_API_BASE_URL,
        "FDC_API_KEY": settings.FDC_DEFAULT_API_KEY,
        "FDC_REQUEST_TIMEOUT": settings.FDC_REQUEST_TIMEOUT,
        "OLLAMA_BASE_URL": settings.OLLAMA_BASE_URL,
        "OLLAMA_MODEL": settings.OLLAMA_MODEL,
        "DEBUG": settings.DEBUG,
    }

    if ENV_LOCAL_PATH.exists():
        try:
            with ENV_LOCAL_PATH.open("r", encoding="utf-8") as file:
                file_overrides = json.load(file)
                effective_values.update({k: v for k, v in file_overrides.items() if v is not None})
        except json.JSONDecodeError as exc:  # pragma: no cover - defensive logging
            logger.warning("Failed to parse env.local.json: %s", exc)

    return EnvSettingsResponse(values=effective_values)


@router.post("", response_model=EnvSettingsResponse, status_code=status.HTTP_200_OK)
async def update_env_settings(payload: EnvSettingsPayload, request: Request) -> EnvSettingsResponse:
    """Persist overrides to env.local.json so the backend picks them up next reload."""
    try:
        ENV_LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
        merged_payload: Dict[str, str | int | float | bool] = {}

        if ENV_LOCAL_PATH.exists():
            try:
                with ENV_LOCAL_PATH.open("r", encoding="utf-8") as existing_file:
                    existing_values = json.load(existing_file)
                    if isinstance(existing_values, dict):
                        merged_payload.update(existing_values)
            except json.JSONDecodeError:  # pragma: no cover - best effort
                logger.warning("Existing env.local.json contained invalid JSON; overwriting with new values.")

        for key, value in payload.values.items():
            if value is None:
                merged_payload.pop(key, None)
                continue

            if isinstance(value, str) and value.strip() == "":
                merged_payload.pop(key, None)
                continue

            merged_payload[key] = value

        with ENV_LOCAL_PATH.open("w", encoding="utf-8") as file:
            json.dump(merged_payload, file, indent=2)
    except OSError as exc:
        logger.exception("Failed to write env.local.json")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    # Return the merged view after saving so the UI sees fresh values.
    settings.reload()

    fdc_service = getattr(request.app.state, "fdc_service", None)
    if fdc_service is not None:
        try:
            fdc_service._base_url = settings.FDC_API_BASE_URL.rstrip("/")
            fdc_service._timeout_seconds = settings.FDC_REQUEST_TIMEOUT
        except Exception as exc:  # pragma: no cover - best effort
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
            )
            refreshed_client.connect()

            existing_client = getattr(request.app.state, "neo4j_client", None)
            if existing_client is not None:
                try:
                    existing_client.close()
                except Exception:  # pragma: no cover - best effort
                    logger.debug("Failed to close previous Neo4j client during refresh.")

            request.app.state.neo4j_client = refreshed_client
        except Exception as exc:  # pragma: no cover - best effort
            logger.warning("Neo4j client refresh failed after settings update: %s", exc)

    ollama_base_url = settings.OLLAMA_BASE_URL
    ollama_model = settings.OLLAMA_MODEL

    if ollama_base_url:
        try:
            refreshed_ollama = OllamaService(base_url=ollama_base_url, model=ollama_model)
            is_available = await refreshed_ollama.check_health()
            if is_available:
                request.app.state.ollama_service = refreshed_ollama
            else:
                logger.warning("OLLAMA service unavailable after settings update; keeping previous instance.")
        except Exception as exc:  # pragma: no cover - best effort
            logger.warning("OLLAMA service refresh failed after settings update: %s", exc)

    return await read_env_settings()
