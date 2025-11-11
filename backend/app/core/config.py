import json
import logging
import os
from pathlib import Path
from typing import Dict, List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

ENV_LOCAL_PATH = Path(__file__).resolve().parents[2] / "env.local.json"


def _apply_env_local() -> None:
    if not ENV_LOCAL_PATH.exists():
        return

    try:
        with ENV_LOCAL_PATH.open("r", encoding="utf-8") as file:
            data: Dict[str, object] = json.load(file)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive logging
        logger.warning("Failed to parse env.local.json: %s", exc)
        return

    for key, value in data.items():
        # Ignore unset/empty overrides so base .env values remain intact
        if value is None or (isinstance(value, str) and value.strip() == ""):
            os.environ.pop(key, None)
            continue

        os.environ[key] = str(value)


load_dotenv(override=True)
_apply_env_local()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

    APP_NAME: str = "Formulation Graph Studio"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # IMPORTANT: No hardcoded production credentials or endpoints.
    # Provide these via environment variables or backend/env.local.json (loaded by the app).
    NEO4J_URI: str = Field(default="")
    NEO4J_USER: str = Field(default="")
    NEO4J_PASSWORD: str = Field(default="")
    NEO4J_DATABASE: str = Field(default="neo4j")

    OLLAMA_BASE_URL: str = Field(default="")
    OLLAMA_MODEL: str = Field(default="llama2")
    OLLAMA_TIMEOUT: int = Field(default=60)
    OLLAMA_EMBED_MODEL: str = Field(default="")
    OLLAMA_EMBED_BATCH_SIZE: int = Field(default=16)

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "*"]

    AI_SERVICE_MODE: str = "auto"
    AI_RETRY_ATTEMPTS: int = 3
    AI_TIMEOUT_SECONDS: int = 30

    FDC_API_BASE_URL: str = "https://api.nal.usda.gov/fdc/v1"
    FDC_DEFAULT_API_KEY: str = Field(default="", alias="FDC_API_KEY")
    FDC_REQUEST_TIMEOUT: int = 30

    GRAPH_SCHEMA_NAME: str = "FormulationGraph"

    GRAPHRAG_CHUNK_INDEX_NAME: str = Field(default="knowledge_chunks")
    GRAPHRAG_METADATA_ID_KEYS: List[str] = Field(default_factory=list)
    GRAPHRAG_CACHE_MAX_ENTRIES: int = Field(default=64)
    GRAPHRAG_CACHE_TTL_SECONDS: float = Field(default=120.0)
    GRAPHRAG_CHUNK_CONTENT_MAX_CHARS: int = Field(default=2000)

    FORMULATION_CACHE_TTL_SECONDS: int = 20
    FORMULATION_CACHE_MAX_ENTRIES: int = 256
    FORMULATION_RETRY_ATTEMPTS: int = 3
    FORMULATION_RETRY_BACKOFF_SECONDS: float = 0.35
    FORMULATION_RETRY_MAX_BACKOFF_SECONDS: float = 2.0

    def validate(self) -> None:
        """Validate that required environment-backed settings are present.

        This method does not raise in CI but will log warnings for missing values.
        Call this at process start to surface misconfiguration.
        """
        missing = []
        required = {
            "NEO4J_URI": self.NEO4J_URI,
            "NEO4J_USER": self.NEO4J_USER,
            "NEO4J_PASSWORD": self.NEO4J_PASSWORD,
            "OLLAMA_BASE_URL": self.OLLAMA_BASE_URL,
            "OLLAMA_EMBED_MODEL": self.OLLAMA_EMBED_MODEL,
        }

        for name, val in required.items():
            if not val:
                missing.append(name)

        if missing:
            logger.warning(
                "Missing required configuration values: %s. "
                "Provide them via environment variables or backend/env.local.json.",
                ", ".join(missing),
            )

    def reload(self) -> None:
        load_dotenv(override=True)
        _apply_env_local()
        updated = type(self)()
        for field_name in self.model_fields:
            object.__setattr__(self, field_name, getattr(updated, field_name))


settings = Settings()
