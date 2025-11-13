import asyncio
import copy
import logging
import re
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from aiohttp import ClientError
from neo4j import exceptions as neo4j_exceptions

CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent

# Ensure the backend and project roots are on sys.path even when the script is invoked
# from an external working directory (e.g., `python C:\App\backend\main.py`).
for candidate in (CURRENT_DIR, PARENT_DIR):
    candidate_str = str(candidate)
    if candidate_str not in sys.path:
        sys.path.insert(0, candidate_str)

try:  # pragma: no cover - dependency import guard
    from slowapi import _rate_limit_exceeded_handler  # type: ignore[import-not-found]
    from slowapi.errors import RateLimitExceeded  # type: ignore[import-not-found]
    from slowapi.middleware import SlowAPIMiddleware  # type: ignore[import-not-found]
except ImportError as exc:  # pragma: no cover - fail fast if missing
    raise RuntimeError("slowapi must be installed to run the API server") from exc

SENSITIVE_PATTERNS = [
    re.compile(r"(api[_-]?key\s*[:=]\s*)([^\s,;]+)", re.IGNORECASE),
    re.compile(r"(password\s*[:=]\s*)([^\s,;]+)", re.IGNORECASE),
    re.compile(r"(secret\s*[:=]\s*)([^\s,;]+)", re.IGNORECASE),
    re.compile(r"(token\s*[:=]\s*)([^\s,;]+)", re.IGNORECASE),
    re.compile(r"(authorization\s*[:=]\s*Bearer\s+)([^\s,;]+)", re.IGNORECASE),
]


def _sanitize_text(value: str) -> str:
    redacted = value
    for pattern in SENSITIVE_PATTERNS:
        redacted = pattern.sub(r"\1********", redacted)
    return redacted


class SanitizingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # pragma: no cover - formatting helper
        record_copy = copy.copy(record)
        if record_copy.args:
            record_copy.args = tuple(_sanitize_text(str(arg)) for arg in record_copy.args)
        formatted = super().format(record_copy)
        return _sanitize_text(formatted)

from app.api.routes import router
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.neo4j_client import Neo4jClient
from app.services.ollama_service import OllamaService
from app.services.fdc_service import FDCService, FDCServiceError
from app.services.graph_schema_service import GraphSchemaService
from app.services.formulation_pipeline import attach_formulation_pipeline
from app.services.embedding_service import OllamaEmbeddingClient
from app.services.graphrag_retrieval import GraphRAGRetrievalService


def configure_logging() -> None:
    log_dir = Path(settings.LOG_DIRECTORY)
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / settings.LOG_FILE_NAME

    formatter = SanitizingFormatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=settings.LOG_MAX_BYTES,
        backupCount=settings.LOG_BACKUP_COUNT,
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    logging.basicConfig(level=logging.INFO, handlers=[console_handler, file_handler])


configure_logging()
logger = logging.getLogger(__name__)

settings.warn_for_missing_configuration()

@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    logger.info("Starting up Formulation Graph Studio API...")

    neo4j_client: Neo4jClient | None = None
    ollama_service: OllamaService | None = None
    fdc_service: FDCService | None = None
    graph_schema_service: GraphSchemaService | None = None
    formulation_pipeline: Any = None
    graphrag_retrieval_service: GraphRAGRetrievalService | None = None

    try:
        neo4j_client = Neo4jClient(
            uri=settings.NEO4J_URI,
            user=settings.NEO4J_USER,
            password=settings.NEO4J_PASSWORD,
            database=settings.NEO4J_DATABASE,
            max_connection_pool_size=settings.NEO4J_MAX_CONNECTION_POOL_SIZE,
            max_connection_lifetime_seconds=settings.NEO4J_MAX_CONNECTION_LIFETIME_SECONDS,
            connection_acquisition_timeout_seconds=settings.NEO4J_CONNECTION_ACQUISITION_TIMEOUT_SECONDS,
            encrypted=settings.NEO4J_ENCRYPTED,
        )
        neo4j_client.connect()
        logger.info("Neo4j connected")
    except neo4j_exceptions.Neo4jError as exc:
        logger.warning("Neo4j connection failed: %s", exc)
        neo4j_client = None
    except OSError as exc:  # pragma: no cover - defensive guard
        logger.exception("Unexpected OS error during Neo4j startup")
        raise RuntimeError("Neo4j startup failed due to system error") from exc
    
    try:
        ollama_service = OllamaService(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            timeout_seconds=settings.OLLAMA_TIMEOUT,
        )
        if await ollama_service.check_health():
            logger.info("OLLAMA service connected")
        else:
            logger.warning("OLLAMA service not available")
    except ClientError as exc:
        logger.warning("OLLAMA service failed: %s", exc)
        ollama_service = None
    except (asyncio.TimeoutError, OSError) as exc:
        logger.warning("OLLAMA startup encountered connectivity issue: %s", exc)
        ollama_service = None

    try:
        fdc_service = FDCService(
            base_url=settings.FDC_API_BASE_URL,
            timeout=settings.FDC_REQUEST_TIMEOUT,
        )
        await fdc_service.start()
        logger.info("FDC service client initialized")
    except (FDCServiceError, ClientError, RuntimeError) as exc:
        logger.warning("FDC service initialization failed: %s", exc)
        fdc_service = None
    except (asyncio.TimeoutError, OSError) as exc:
        logger.warning("FDC service startup encountered connectivity issue: %s", exc)
        fdc_service = None

    graph_schema_service = GraphSchemaService(
        neo4j_client=neo4j_client,
        schema_name=settings.GRAPH_SCHEMA_NAME,
    )

    formulation_pipeline = attach_formulation_pipeline(
        fastapi_app,
        neo4j_client,
        cache_ttl=settings.FORMULATION_CACHE_TTL_SECONDS,
        cache_entries=settings.FORMULATION_CACHE_MAX_ENTRIES,
        retry_attempts=settings.FORMULATION_RETRY_ATTEMPTS,
        retry_backoff=settings.FORMULATION_RETRY_BACKOFF_SECONDS,
        retry_max_backoff=settings.FORMULATION_RETRY_MAX_BACKOFF_SECONDS,
    )

    graphrag_retrieval_service = None
    if neo4j_client and settings.GRAPHRAG_CHUNK_INDEX_NAME:
        if settings.OLLAMA_BASE_URL and settings.OLLAMA_EMBED_MODEL:
            try:
                embedding_client = OllamaEmbeddingClient(
                    base_url=settings.OLLAMA_BASE_URL,
                    model=settings.OLLAMA_EMBED_MODEL,
                    timeout=settings.OLLAMA_TIMEOUT,
                )
                metadata_keys = settings.GRAPHRAG_METADATA_ID_KEYS or None
                graphrag_retrieval_service = GraphRAGRetrievalService(
                    neo4j_client=neo4j_client,
                    embedding_client=embedding_client,
                    chunk_index_name=settings.GRAPHRAG_CHUNK_INDEX_NAME,
                    metadata_id_keys=metadata_keys,
                    cache_max_entries=settings.GRAPHRAG_CACHE_MAX_ENTRIES,
                    cache_ttl_seconds=settings.GRAPHRAG_CACHE_TTL_SECONDS,
                    chunk_content_truncate_chars=settings.GRAPHRAG_CHUNK_CONTENT_MAX_CHARS,
                )
                logger.info("GraphRAG retrieval service initialized")
            except (ClientError, RuntimeError, asyncio.TimeoutError, neo4j_exceptions.Neo4jError, OSError) as exc:
                logger.warning("GraphRAG retrieval initialization failed: %s", exc)
                graphrag_retrieval_service = None
        else:
            logger.info("GraphRAG retrieval skipped - embedding configuration missing")

    fastapi_app.state.neo4j_client = neo4j_client
    fastapi_app.state.ollama_service = ollama_service
    fastapi_app.state.fdc_service = fdc_service
    fastapi_app.state.graph_schema_service = graph_schema_service
    fastapi_app.state.graphrag_retrieval_service = graphrag_retrieval_service

    try:
        yield
    finally:
        if neo4j_client:
            neo4j_client.close()
            logger.info("Neo4j connection closed")
        if formulation_pipeline:
            # Clear cached references to avoid leaking across reloads
            fastapi_app.state.formulation_pipeline = None
            fastapi_app.state.formulation_event_bus = None
        if ollama_service:
            await ollama_service.close()
            logger.info("OLLAMA client session closed")
        if fdc_service:
            await fdc_service.close()
            logger.info("FDC service client closed")

app = FastAPI(
    title="Formulation & Nutritional Recipe Studio API",
    version="1.0.0",
    description="Unified formulation and nutritional intelligence platform API powered by Neo4j and OLLAMA AI",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
if settings.RATE_LIMIT_ENABLED:
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

app.include_router(router, prefix="/api")

@app.get("/", tags=["Root"])
async def read_root():
    return {
        "message": "Formulation & Nutritional Recipe Studio API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/health", tags=["Health"])
async def health_check(request: Request):
    dependencies: dict[str, str] = {
        "neo4j": "unavailable",
        "ollama": "unavailable",
        "fdc": "unavailable",
    }

    neo4j_client: Neo4jClient | None = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is not None:
        try:
            dependencies["neo4j"] = "healthy" if neo4j_client.check_health() else "unhealthy"
        except neo4j_exceptions.Neo4jError:
            dependencies["neo4j"] = "unhealthy"

    ollama_service: OllamaService | None = getattr(request.app.state, "ollama_service", None)
    if ollama_service is not None:
        try:
            dependencies["ollama"] = "healthy" if await ollama_service.check_health() else "unhealthy"
        except (ClientError, asyncio.TimeoutError):  # pragma: no cover - network variability
            dependencies["ollama"] = "unhealthy"

    fdc_service: FDCService | None = getattr(request.app.state, "fdc_service", None)
    if fdc_service is not None:
        dependencies["fdc"] = "healthy" if await fdc_service.check_health() else "unhealthy"

    if all(status == "healthy" for status in dependencies.values()):
        overall_status = "healthy"
    elif any(status == "unhealthy" for status in dependencies.values()):
        overall_status = "degraded"
    else:
        overall_status = "initializing"

    return {
        "status": overall_status,
        "dependencies": dependencies,
        "timestamp": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon_handler() -> Response:
    """Return a 204 so favicon fetches from API clients do not log 404s."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
