from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.routes import router
from app.core.config import settings
from app.db.neo4j_client import Neo4jClient
from app.services.ollama_service import OllamaService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

neo4j_client = None
ollama_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global neo4j_client, ollama_service
    
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
        ollama_service = OllamaService(base_url=settings.OLLAMA_BASE_URL)
        if await ollama_service.check_health():
            logger.info("✓ OLLAMA service connected")
        else:
            logger.warning("⚠ OLLAMA service not available")
    except Exception as e:
        logger.warning(f"⚠ OLLAMA service failed: {e}")
    
    app.state.neo4j_client = neo4j_client
    app.state.ollama_service = ollama_service
    
    yield
    
    if neo4j_client:
        neo4j_client.close()
        logger.info("Neo4j connection closed")

app = FastAPI(
    title="Formulation Graph Studio API",
    version="1.0.0",
    description="Food & Beverage Formulation Management Platform API with Neo4j and OLLAMA AI",
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
        "message": "Formulation Graph Studio API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
