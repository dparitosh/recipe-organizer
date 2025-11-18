"""Service for persisting nutrition labels to Neo4j."""

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid

logger = logging.getLogger(__name__)


class NutritionPersistenceService:
    """Handles saving and retrieving nutrition labels from Neo4j."""

    def __init__(self, neo4j_client: Any) -> None:
        self.neo4j_client = neo4j_client

    def save_nutrition_label(
        self,
        formulation_id: str,
        nutrition_facts: Dict[str, Any],
        generated_by: Optional[str] = "system",
    ) -> str:
        """
        Save nutrition label to Neo4j with auto-incrementing version.
        
        Args:
            formulation_id: ID of the formulation
            nutrition_facts: Complete nutrition facts data
            generated_by: User or system that generated the label
            
        Returns:
            labelId: Unique identifier for the saved label
        """
        if not self.neo4j_client or not self.neo4j_client.driver:
            raise RuntimeError("Neo4j client not available")

        label_id = f"nutr_{uuid.uuid4().hex[:12]}"
        
        # Cypher query to save with auto-increment version
        query = """
        MATCH (f:Formulation {id: $formulation_id})
        
        // Get the next version number
        OPTIONAL MATCH (f)-[:HAS_NUTRITION_LABEL]->(existing:NutritionLabel)
        WITH f, COALESCE(MAX(existing.version), 0) + 1 as nextVersion
        
        // Create new label
        CREATE (label:NutritionLabel {
            labelId: $label_id,
            formulationId: $formulation_id,
            version: nextVersion,
            servingSize: $serving_size,
            servingSizeUnit: $serving_size_unit,
            servingsPerContainer: $servings_per_container,
            calories: $calories,
            nutrients: $nutrients,
            additionalNutrients: $additional_nutrients,
            generatedAt: datetime($generated_at),
            generatedBy: $generated_by
        })
        
        // Link to formulation
        CREATE (f)-[:HAS_NUTRITION_LABEL]->(label)
        
        RETURN label.labelId as labelId, label.version as version
        """
        
        try:
            with self.neo4j_client.driver.session() as session:
                result = session.run(
                    query,
                    formulation_id=formulation_id,
                    label_id=label_id,
                    serving_size=nutrition_facts.get("serving_size"),
                    serving_size_unit=nutrition_facts.get("serving_size_unit"),
                    servings_per_container=nutrition_facts.get("servings_per_container"),
                    calories=nutrition_facts.get("calories"),
                    nutrients=nutrition_facts.get("nutrients", {}),
                    additional_nutrients=nutrition_facts.get("additional_nutrients", []),
                    generated_at=datetime.utcnow().isoformat(),
                    generated_by=generated_by,
                )
                
                record = result.single()
                if record:
                    version = record["version"]
                    logger.info(
                        "Saved nutrition label %s (version %d) for formulation %s",
                        label_id,
                        version,
                        formulation_id,
                    )
                    return label_id
                else:
                    raise RuntimeError(f"Formulation {formulation_id} not found")
                    
        except Exception as exc:
            logger.error(
                "Failed to save nutrition label for formulation %s: %s",
                formulation_id,
                exc,
                exc_info=True,
            )
            raise RuntimeError(f"Failed to save nutrition label: {exc}") from exc

    def get_nutrition_label_history(
        self,
        formulation_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get nutrition label history for a formulation.
        
        Args:
            formulation_id: ID of the formulation
            limit: Maximum number of labels to return
            
        Returns:
            List of nutrition labels ordered by version DESC
        """
        if not self.neo4j_client or not self.neo4j_client.driver:
            raise RuntimeError("Neo4j client not available")

        query = """
        MATCH (f:Formulation {id: $formulation_id})-[:HAS_NUTRITION_LABEL]->(label:NutritionLabel)
        RETURN label
        ORDER BY label.version DESC
        LIMIT $limit
        """
        
        try:
            with self.neo4j_client.driver.session() as session:
                result = session.run(
                    query,
                    formulation_id=formulation_id,
                    limit=limit,
                )
                
                labels = []
                for record in result:
                    label_node = record["label"]
                    labels.append({
                        "labelId": label_node.get("labelId"),
                        "formulationId": label_node.get("formulationId"),
                        "version": label_node.get("version"),
                        "servingSize": label_node.get("servingSize"),
                        "servingSizeUnit": label_node.get("servingSizeUnit"),
                        "servingsPerContainer": label_node.get("servingsPerContainer"),
                        "calories": label_node.get("calories"),
                        "nutrients": label_node.get("nutrients", {}),
                        "additionalNutrients": label_node.get("additionalNutrients", []),
                        "generatedAt": label_node.get("generatedAt"),
                        "generatedBy": label_node.get("generatedBy"),
                    })
                
                logger.info(
                    "Retrieved %d nutrition labels for formulation %s",
                    len(labels),
                    formulation_id,
                )
                return labels
                
        except Exception as exc:
            logger.error(
                "Failed to get nutrition label history for formulation %s: %s",
                formulation_id,
                exc,
                exc_info=True,
            )
            raise RuntimeError(f"Failed to get nutrition label history: {exc}") from exc

    def get_nutrition_label_by_id(self, label_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific nutrition label by ID.
        
        Args:
            label_id: ID of the nutrition label
            
        Returns:
            Nutrition label data or None if not found
        """
        if not self.neo4j_client or not self.neo4j_client.driver:
            raise RuntimeError("Neo4j client not available")

        query = """
        MATCH (label:NutritionLabel {labelId: $label_id})
        RETURN label
        """
        
        try:
            with self.neo4j_client.driver.session() as session:
                result = session.run(query, label_id=label_id)
                record = result.single()
                
                if not record:
                    return None
                
                label_node = record["label"]
                return {
                    "labelId": label_node.get("labelId"),
                    "formulationId": label_node.get("formulationId"),
                    "version": label_node.get("version"),
                    "servingSize": label_node.get("servingSize"),
                    "servingSizeUnit": label_node.get("servingSizeUnit"),
                    "servingsPerContainer": label_node.get("servingsPerContainer"),
                    "calories": label_node.get("calories"),
                    "nutrients": label_node.get("nutrients", {}),
                    "additionalNutrients": label_node.get("additionalNutrients", []),
                    "generatedAt": label_node.get("generatedAt"),
                    "generatedBy": label_node.get("generatedBy"),
                }
                
        except Exception as exc:
            logger.error(
                "Failed to get nutrition label %s: %s",
                label_id,
                exc,
                exc_info=True,
            )
            raise RuntimeError(f"Failed to get nutrition label: {exc}") from exc
