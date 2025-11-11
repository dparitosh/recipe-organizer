from fastapi import APIRouter, Request, HTTPException, status
from datetime import datetime
from typing import Any, Dict, List, Sequence
import asyncio
import logging

from app.models.schemas import (
    AICompletionRequest,
    AICompletionResponse,
    AIQueryRequest,
    AIQueryResponse,
    NodeHighlight,
    RelationshipSummary,
    Recommendation,
)
from app.services.graphrag_retrieval import (
    GraphRAGRetrievalError,
    RetrievalChunk,
    StructuredEntityContext,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _truncate_text(value: str, limit: int) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


def _summarize_chunk_context(
    chunks: Sequence[RetrievalChunk],
    *,
    max_chunks: int = 3,
    max_chars: int = 1200,
) -> str:
    if not chunks:
        return ""

    selected = list(chunks[:max_chunks])
    per_chunk_limit = max(200, max_chars // max(1, len(selected)))

    lines: List[str] = ["GraphRAG knowledge chunks:"]
    for chunk in selected:
        header_parts = [f"[{chunk.chunk_id}] score={chunk.score:.3f}"]
        if chunk.source_id:
            header_parts.append(f"source={chunk.source_id}")
        if chunk.source_type:
            header_parts.append(f"type={chunk.source_type}")

        lines.append(" ".join(header_parts))

        metadata_summary = _summarize_chunk_metadata(chunk.metadata)
        if metadata_summary:
            lines.append(f"Metadata: {metadata_summary}")

        lines.append(f"Content: {_truncate_text(chunk.content, per_chunk_limit)}")

    return "\n".join(lines)


def _summarize_chunk_metadata(metadata: Dict[str, Any], *, max_items: int = 4) -> str:
    if not metadata:
        return ""

    ignored_keys = {
        "source",
        "source_type",
        "chunk_strategy",
        "chunk_index",
        "token_start",
        "token_end",
        "token_length",
        "content_word_count",
    }

    details: List[str] = []
    for key, value in metadata.items():
        if key in ignored_keys:
            continue
        if isinstance(value, (list, dict)):
            continue
        details.append(f"{key}={value}")
        if len(details) >= max_items:
            break
    return ", ".join(details)


def _build_node_highlights_from_structured(
    entities: Sequence[StructuredEntityContext],
    *,
    limit: int = 10,
) -> List[NodeHighlight]:
    highlights: List[NodeHighlight] = []
    for entity in entities[:limit]:
        node_data = entity.node or {}
        node_props: Dict[str, Any] = node_data.get("properties", {}) or {}
        node_id = node_props.get("id") or node_data.get("id")
        if not node_id:
            continue
        labels = node_data.get("labels") or []
        node_type = labels[0] if labels else str(node_props.get("type", "Unknown"))
        name = node_props.get("name") or node_id
        highlights.append(
            NodeHighlight(
                id=str(node_id),
                type=str(node_type),
                name=str(name),
                properties=node_props,
            )
        )
    return highlights


def _build_relationship_summaries_from_structured(
    entities: Sequence[StructuredEntityContext],
) -> List[RelationshipSummary]:
    counts: Dict[str, int] = {}
    examples: Dict[str, Dict[str, str]] = {}

    for entity in entities:
        node_props = (entity.node or {}).get("properties", {}) or {}
        source_name = str(node_props.get("name") or node_props.get("id") or "unknown")
        for rel in entity.relationships:
            rel_type = rel.type or "UNKNOWN"
            counts[rel_type] = counts.get(rel_type, 0) + 1
            if rel_type not in examples and rel.target:
                target_props = rel.target.get("properties", {}) or {}
                target_name = str(target_props.get("name") or target_props.get("id") or "unknown")
                examples[rel_type] = {"source": source_name, "target": target_name}

    summaries: List[RelationshipSummary] = []
    for rel_type, count in sorted(counts.items(), key=lambda item: item[1], reverse=True):
        example = examples.get(rel_type)
        summaries.append(
            RelationshipSummary(
                type=str(rel_type),
                count=count,
                description=f"Found {count} {rel_type} relationships",
                examples=[example] if example else None,
            )
        )
    return summaries


def _summarize_structured_entities(
    entities: Sequence[StructuredEntityContext],
    *,
    max_entities: int = 3,
    max_relationships: int = 3,
) -> str:
    if not entities:
        return ""

    lines: List[str] = ["Structured graph context:"]
    for entity in entities[:max_entities]:
        node_data = entity.node or {}
        node_props = node_data.get("properties", {}) or {}
        labels = node_data.get("labels") or []
        node_label = labels[0] if labels else str(node_props.get("type", "Unknown"))
        node_name = node_props.get("name") or node_props.get("id")
        lines.append(f"- {node_name} [{node_label}]")
        for rel in entity.relationships[:max_relationships]:
            target_props = (rel.target or {}).get("properties", {}) or {}
            target_name = target_props.get("name") or target_props.get("id")
            lines.append(f"  -> {rel.type} {target_name}")

    return "\n".join(lines)

@router.post("/query", response_model=AIQueryResponse, summary="Process AI Query")
async def process_ai_query(request_data: AIQueryRequest, request: Request):
    """
    Process a natural language query using OLLAMA AI.
    Supports online mode (with AI), offline mode (keyword search), and auto mode (fallback).
    Can optionally include Neo4j graph data for enhanced context.
    """
    start_time = datetime.now()
    
    service_mode = request_data.service_mode or "auto"
    
    if service_mode in ["online", "auto"]:
        try:
            response = await process_online_query(
                query=request_data.query,
                include_graph=request_data.include_graph,
                request=request
            )
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            response.execution_time_ms = execution_time
            response.mode = "online"
            return response
        
        except Exception as e:
            logger.warning(f"Online query failed: {e}")
            if service_mode == "online":
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"AI service unavailable: {str(e)}"
                )
            
            response = await process_offline_query(request_data.query)
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            response.execution_time_ms = execution_time
            response.mode = "offline"
            return response
    
    else:
        response = await process_offline_query(request_data.query)
        execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
        response.execution_time_ms = execution_time
        response.mode = "offline"
        return response


@router.post("/completion", response_model=AICompletionResponse, summary="Run raw AI completion")
async def generate_completion(payload: AICompletionRequest, request: Request) -> AICompletionResponse:
    """Expose a thin wrapper around the Ollama completion API for structured agent prompts."""

    start_time = datetime.now()

    ollama_service = getattr(request.app.state, "ollama_service", None)
    if ollama_service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="OLLAMA service not initialized")

    try:
        completion = await ollama_service.generate_completion(
            prompt=payload.prompt,
            system_prompt=payload.system_prompt,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
        )
    except asyncio.TimeoutError as exc:
        logger.error("OLLAMA completion timed out: %s", exc)
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="OLLAMA request timed out")
    except Exception as exc:  # pragma: no cover - passthrough to caller with context
        logger.error("OLLAMA completion failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return AICompletionResponse(completion=completion.strip(), model=ollama_service.model, duration_ms=duration_ms)


async def process_online_query(query: str, include_graph: bool, request: Request) -> AIQueryResponse:
    """Process query using OLLAMA AI and optionally Neo4j graph data."""
    
    ollama_service = request.app.state.ollama_service
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    retrieval_service = getattr(request.app.state, "graphrag_retrieval_service", None)
    
    if not ollama_service:
        raise Exception("OLLAMA service not initialized")
    
    cypher_query = None
    node_highlights = []
    relationship_summaries = []
    data_sources = ["OLLAMA AI"]
    graph_context_sections: List[str] = []

    retrieval_chunks: List[RetrievalChunk] = []
    structured_entities: List[StructuredEntityContext] = []

    if include_graph and retrieval_service:
        try:
            retrieval_result = await asyncio.to_thread(
                retrieval_service.retrieve,
                query,
                limit=5,
                structured_limit=25,
            )
            retrieval_chunks = retrieval_result.chunks
            structured_entities = retrieval_result.structured_entities
        except GraphRAGRetrievalError as exc:
            logger.warning("GraphRAG retrieval failed: %s", exc)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("GraphRAG retrieval raised unexpected error: %s", exc)

    if include_graph and retrieval_chunks:
        chunk_section = _summarize_chunk_context(retrieval_chunks)
        if chunk_section:
            graph_context_sections.append(chunk_section)
        if "GraphRAG Knowledge Base" not in data_sources:
            data_sources.append("GraphRAG Knowledge Base")

    if include_graph and structured_entities:
        node_highlights = _build_node_highlights_from_structured(structured_entities)
        relationship_summaries = _build_relationship_summaries_from_structured(structured_entities)
        structured_section = _summarize_structured_entities(structured_entities)
        if structured_section:
            graph_context_sections.append(structured_section)

    use_fallback_cypher = include_graph and not graph_context_sections and neo4j_client is not None
    
    if use_fallback_cypher:
        try:
            cypher_query = await ollama_service.generate_cypher_query(query)
            logger.info(f"Generated Cypher: {cypher_query}")
            
            records = neo4j_client.execute_query(cypher_query)
            
            nodes_dict = {}
            relationships = []
            
            for record in records:
                for key, value in record.items():
                    if hasattr(value, '__class__') and value.__class__.__name__ == 'Node':
                        node_id = str(value.id)
                        if node_id not in nodes_dict:
                            labels = list(value.labels) if hasattr(value, 'labels') else []
                            props = dict(value)
                            nodes_dict[node_id] = {
                                "id": node_id,
                                "type": labels[0] if labels else "Unknown",
                                "name": props.get("name", props.get("id", node_id)),
                                "properties": props
                            }
                    
                    elif hasattr(value, '__class__') and value.__class__.__name__ == 'Relationship':
                        relationships.append({
                            "type": value.type,
                            "source": str(value.start_node.id) if hasattr(value, 'start_node') else None,
                            "target": str(value.end_node.id) if hasattr(value, 'end_node') else None
                        })
            
            nodes = list(nodes_dict.values())
            node_highlights = [
                NodeHighlight(**node) for node in nodes[:10]
            ]
            
            rel_counts = {}
            for rel in relationships:
                rel_type = rel["type"]
                rel_counts[rel_type] = rel_counts.get(rel_type, 0) + 1
            
            for rel_type, count in rel_counts.items():
                relationship_summaries.append(
                    RelationshipSummary(
                        type=rel_type,
                        count=count,
                        description=f"Found {count} {rel_type} relationships"
                    )
                )
            
            graph_context_sections.append(
                f"Graph query results:\n- {len(nodes)} nodes\n- {len(relationships)} relationships"
            )
            data_sources.append("Neo4j Graph Database")
        
        except Exception as e:
            logger.warning(f"Graph query failed: {e}")
            graph_context_sections.append("Note: Graph query encountered an issue, fallback context only.")
    
    graph_context = "\n\n".join(section for section in graph_context_sections if section)

    answer = await ollama_service.generate_answer(
        query=query,
        context=graph_context,
        data_sources=data_sources
    )
    
    recommendations_list = await ollama_service.generate_recommendations(
        query=query,
        answer=answer
    )
    
    recommendations = [
        Recommendation(**rec) for rec in recommendations_list
    ]
    
    return AIQueryResponse(
        answer=answer,
        mode="online",
        execution_time_ms=0,
        confidence=0.85,
        data_sources=data_sources,
        cypher_query=cypher_query,
        node_highlights=node_highlights,
        relationship_summaries=relationship_summaries,
        recommendations=recommendations
    )


async def process_offline_query(query: str) -> AIQueryResponse:
    """Process query using simple keyword matching (offline mode)."""
    
    query_lower = query.lower()
    
    answer = "Offline mode: AI service is currently unavailable. "
    
    keyword_responses = {
        "cost": "Cost analysis requires real-time data from the calculation engine. You can view cost details in the Calculations tab.",
        "yield": "Yield information is available in the formulations view and BOM configurations.",
        "ingredient": "Ingredient search is available in the formulation editor. Use the search bar to find specific ingredients.",
        "recipe": "Recipe data can be viewed in the formulations list. Navigate to the Formulations tab.",
        "nutrition": "Nutritional data requires connection to USDA FDC. Check the Integrations settings.",
        "formulation": "Formulation management features are available in the main Formulations view.",
        "graph": "Graph visualization is available in the Relationships tab. Load graph data to explore connections.",
    }
    
    matched = False
    for keyword, response in keyword_responses.items():
        if keyword in query_lower:
            answer += response
            matched = True
            break
    
    if not matched:
        answer += "Please try again when the AI service is available, or use the search and filter tools throughout the application."
    
    recommendations = [
        Recommendation(
            type="general",
            impact="low",
            description="Use the formulations view to search and filter recipes manually",
            actionable=True
        ),
        Recommendation(
            type="general",
            impact="low",
            description="Check service status in Settings > AI Service to see when online mode becomes available",
            actionable=True
        ),
        Recommendation(
            type="general",
            impact="medium",
            description="Explore the graph visualization in the Relationships tab for ingredient connections",
            actionable=True
        )
    ]
    
    return AIQueryResponse(
        answer=answer,
        mode="offline",
        execution_time_ms=0,
        confidence=0.3,
        data_sources=["Local Cache"],
        recommendations=recommendations
    )
