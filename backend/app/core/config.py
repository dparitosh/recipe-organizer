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

    NEO4J_URI: str = "neo4j+s://2cccd05b.databases.neo4j.io"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "tcs12345"
    NEO4J_DATABASE: str = "neo4j"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama2"
    OLLAMA_TIMEOUT: int = 60

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "*"]

    AI_SERVICE_MODE: str = "auto"
    AI_RETRY_ATTEMPTS: int = 3
    AI_TIMEOUT_SECONDS: int = 30

    FDC_API_BASE_URL: str = "https://api.nal.usda.gov/fdc/v1"
    FDC_DEFAULT_API_KEY: str = Field(default="", alias="FDC_API_KEY")
    FDC_REQUEST_TIMEOUT: int = 30

    GRAPH_SCHEMA_NAME: str = "FormulationGraph"

    def reload(self) -> None:
        load_dotenv(override=True)
        _apply_env_local()
        updated = type(self)()
        for field_name in self.model_fields:
            object.__setattr__(self, field_name, getattr(updated, field_name))


settings = Settings()
