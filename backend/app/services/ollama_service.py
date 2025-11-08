import aiohttp
import asyncio
import json
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama2"):
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.timeout = aiohttp.ClientTimeout(total=60)
    
    async def check_health(self) -> bool:
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    return response.status == 200
        except Exception as e:
            logger.warning(f"OLLAMA health check failed: {e}")
            return False
    
    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        try:
            full_prompt = prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"
            
            payload = {
                "model": self.model,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("response", "")
                    else:
                        error_text = await response.text()
                        raise Exception(f"OLLAMA API error: {error_text}")
        
        except Exception as e:
            logger.error("OLLAMA generation failed", exc_info=True)
            raise
    
    async def generate_cypher_query(self, natural_language: str) -> str:
        schema_context = """
Neo4j Graph Database Schema:

Nodes:
- Formulation: Represents a recipe or formulation (properties: id, name, description, status, version, created_at)
- Food: Represents ingredients or raw materials (properties: id, name, fdc_id, category, supplier)
- Nutrient: Nutritional components (properties: id, name, unit, value)
- Process: Manufacturing processes (properties: id, name, description, duration, temperature)
- Recipe: Base recipe type (properties: id, name, type)
- MasterRecipe: Master recipe definition (properties: id, name, version, approved_by)
- ManufacturingRecipe: Production-specific recipe (properties: id, name, plant_id, efficiency)
- Plant: Manufacturing plant (properties: id, name, location, capacity)
- SalesOrder: Customer orders (properties: id, order_number, customer, quantity, due_date)

Relationships:
- CONTAINS: Links formulation to its components
- USES_INGREDIENT: Recipe uses specific ingredient
- CONTAINS_NUTRIENT: Food contains nutritional information
- REQUIRES_PROCESS: Formulation requires manufacturing process
- DERIVED_FROM: Manufacturing recipe derived from master recipe
- PRODUCES: Plant produces manufacturing recipe
- REQUIRES: Sales order requires manufacturing recipe

Example Cypher Queries:
1. Find all formulations: MATCH (f:Formulation) RETURN f
2. Find ingredients with their nutrients: MATCH (f:Food)-[:CONTAINS_NUTRIENT]->(n:Nutrient) RETURN f.name, n.name, n.value
3. Find recipes using specific ingredient: MATCH (r:Recipe)-[:USES_INGREDIENT]->(f:Food {name: 'ingredient_name'}) RETURN r
4. Find manufacturing recipes with low efficiency: MATCH (mr:ManufacturingRecipe) WHERE mr.efficiency < 90 RETURN mr
"""
        
        prompt = f"""Convert the following natural language query into a valid Neo4j Cypher query.

{schema_context}

Natural Language Query: {natural_language}

Important Instructions:
- Return ONLY the Cypher query, nothing else
- Do not include explanations or markdown
- Make sure the query is syntactically correct
- Use appropriate MATCH, WHERE, and RETURN clauses
- Limit results to 100 records maximum

Cypher Query:"""
        
        system_prompt = "You are a Neo4j Cypher query expert. Generate only valid Cypher queries without any explanation."
        
        cypher_response = await self.generate_completion(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=200
        )
        
        cypher = cypher_response.strip()
        
        if "```" in cypher:
            parts = cypher.split("```")
            for part in parts:
                if "MATCH" in part or "match" in part:
                    cypher = part.strip()
                    if cypher.startswith("cypher"):
                        cypher = cypher[6:].strip()
                    break
        
        return cypher
    
    async def generate_answer(
        self,
        query: str,
        context: str = "",
        data_sources: List[str] = None
    ) -> str:
        system_prompt = """You are an AI assistant specialized in Food & Beverage formulation management.
You help users understand their formulation data, analyze ingredient relationships, and provide actionable insights.
Be concise, specific, and quantitative when possible."""
        
        sources_text = ""
        if data_sources:
            sources_text = f"\n\nData sources: {', '.join(data_sources)}"
        
        prompt = f"""User Query: {query}

Context from database:
{context}
{sources_text}

Provide a clear, helpful answer based on the available data. If you cannot answer with certainty, acknowledge the limitations and suggest what additional information might be needed."""
        
        answer = await self.generate_completion(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=500
        )
        
        return answer
    
    async def generate_recommendations(
        self,
        query: str,
        answer: str,
        context: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        prompt = f"""Based on this F&B formulation query and answer, generate 3-5 actionable recommendations.

Query: {query}
Answer: {answer}

Generate recommendations as a JSON array with this exact format:
[
  {{
    "type": "cost_optimization",
    "impact": "high",
    "description": "Specific actionable recommendation",
    "actionable": true
  }}
]

Valid types: cost_optimization, yield_improvement, substitution, process_optimization, quality_enhancement
Valid impact levels: high, medium, low

Return ONLY the JSON array, no other text."""
        
        try:
            response = await self.generate_completion(
                prompt=prompt,
                temperature=0.7,
                max_tokens=400
            )
            
            response = response.strip()
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            recommendations = json.loads(response)
            
            if isinstance(recommendations, list):
                return recommendations[:5]
            else:
                return []
        
        except Exception as e:
            logger.warning(f"Failed to generate recommendations: {e}")
            return [
                {
                    "type": "general",
                    "impact": "medium",
                    "description": "Review formulation data for optimization opportunities",
                    "actionable": True
                }
            ]
