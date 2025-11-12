from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from contextlib import asynccontextmanager
import logging

from app.api.routes import router
from app.core.config import settings
from app.db.neo4j_client import Neo4jClient
from app.services.ollama_service import OllamaService
from app.services.fdc_service import FDCService
from app.services.graph_schema_service import GraphSchemaService
from app.services.formulation_pipeline import attach_formulation_pipeline
from app.services.embedding_service import OllamaEmbeddingClient
from app.services.graphrag_retrieval import GraphRAGRetrievalService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

neo4j_client = None
ollama_service = None
fdc_service = None
graph_schema_service = None
formulation_pipeline = None
graphrag_retrieval_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_client, ollama_service, fdc_service
    global graph_schema_service, formulation_pipeline, graphrag_retrieval_service
    
    logger.info("Starting up Formulation Graph Studio API...")
    
    try:
        neo4j_client = Neo4jClient(
            uri=settings.NEO4J_URI,
            user=settings.NEO4J_USER,
            password=settings.NEO4J_PASSWORD,
            database=settings.NEO4J_DATABASE
        )
        neo4j_client.connect()
        logger.info("✓ Neo4j connected")
    except Exception as e:
        logger.warning(f"⚠ Neo4j connection failed: {e}")
        neo4j_client = None
    
    try:
        ollama_service = OllamaService(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            timeout_seconds=settings.OLLAMA_TIMEOUT,
        )
        if await ollama_service.check_health():
            logger.info("✓ OLLAMA service connected")
        else:
            logger.warning("⚠ OLLAMA service not available")
    except Exception as e:
        logger.warning(f"⚠ OLLAMA service failed: {e}")
        ollama_service = None

    try:
        fdc_service = FDCService(
            base_url=settings.FDC_API_BASE_URL,
            timeout=settings.FDC_REQUEST_TIMEOUT,
        )
        await fdc_service.start()
        logger.info("✓ FDC service client initialized")
    except Exception as e:
        logger.warning(f"⚠ FDC service initialization failed: {e}")
        fdc_service = None

    graph_schema_service = GraphSchemaService(
        neo4j_client=neo4j_client,
        schema_name=settings.GRAPH_SCHEMA_NAME,
    )

    formulation_pipeline = attach_formulation_pipeline(
        app,
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
                logger.info("✓ GraphRAG retrieval service initialized")
            except Exception as e:  # pragma: no cover - defensive runtime init guard
                logger.warning("⚠ GraphRAG retrieval initialization failed: %s", e)
                graphrag_retrieval_service = None
        else:
            logger.info("⚠ GraphRAG retrieval skipped - embedding configuration missing")

    app.state.neo4j_client = neo4j_client
    app.state.ollama_service = ollama_service
    app.state.fdc_service = fdc_service
    app.state.graph_schema_service = graph_schema_service
    app.state.graphrag_retrieval_service = graphrag_retrieval_service
    
    yield
    
    if neo4j_client:
        neo4j_client.close()
        logger.info("Neo4j connection closed")
    if formulation_pipeline:
        # Clear cached references to avoid leaking across reloads
        app.state.formulation_pipeline = None
        app.state.formulation_event_bus = None
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
async def health_check():
    return {"status": "healthy"}


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
