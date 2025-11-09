from fastapi import APIRouter, Request, HTTPException, status
from datetime import datetime
from typing import Dict, Any, List
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

router = APIRouter()
logger = logging.getLogger(__name__)

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
    neo4j_client = request.app.state.neo4j_client
    
    if not ollama_service:
        raise Exception("OLLAMA service not initialized")
    
    cypher_query = None
    node_highlights = []
    relationship_summaries = []
    graph_context = ""
    data_sources = ["OLLAMA AI"]
    
    if include_graph and neo4j_client:
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
            
            graph_context = f"\n\nGraph Query Results:\n- {len(nodes)} nodes found\n- {len(relationships)} relationships found"
            data_sources.append("Neo4j Graph Database")
        
        except Exception as e:
            logger.warning(f"Graph query failed: {e}")
            graph_context = f"\n\nNote: Graph query encountered an issue, using formulation data only."
    
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
