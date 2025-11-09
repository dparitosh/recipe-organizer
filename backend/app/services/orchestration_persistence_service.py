import json
import logging
import time
from typing import Any, Dict

from neo4j.exceptions import Neo4jError, ServiceUnavailable, SessionExpired, TransientError

from app.db.neo4j_client import Neo4jClient
from .orchestration_types import GraphWriteSet, PersistenceSummary

logger = logging.getLogger(__name__)


class OrchestrationPersistenceService:
    """Persists the output of a multi-agent orchestration into Neo4j."""

    def __init__(
        self,
        neo4j_client: Neo4jClient,
        *,
        max_retries: int = 2,
        backoff_seconds: float = 0.35,
        max_backoff_seconds: float = 2.0,
    ):
        self.neo4j_client = neo4j_client
        self.max_retries = max(0, max_retries)
        self.backoff_seconds = max(0.0, backoff_seconds)
        self.max_backoff_seconds = max_backoff_seconds

    def persist_run(self, write_set: GraphWriteSet) -> PersistenceSummary:
        if not self.neo4j_client.driver:
            raise RuntimeError("Neo4j client is not connected")

        query = self._build_query()
        parameters = self._snapshot_to_parameters(write_set)

        attempt = 0
        while True:
            try:
                if attempt:
                    logger.info(
                        "Retrying orchestration run %s (attempt %s)",
                        write_set.run.get("runId"),
                        attempt + 1,
                    )

                logger.debug("Persisting orchestration run %s", write_set.run.get("runId"))
                result = self.neo4j_client.execute_write(query, parameters)
                return PersistenceSummary(
                    run_id=write_set.run.get("runId", ""),
                    nodes_created=result.get("nodes_created", 0),
                    relationships_created=result.get("relationships_created", 0),
                    properties_set=result.get("properties_set", 0),
                )
            except (ServiceUnavailable, SessionExpired, TransientError) as exc:
                if attempt >= self.max_retries:
                    logger.error("Neo4j write retries exhausted for run %s", write_set.run.get("runId"))
                    raise

                backoff = min(self.backoff_seconds * (2 ** attempt), self.max_backoff_seconds)
                logger.warning(
                    "Retryable Neo4j error while persisting run %s: %s. Backing off %.2fs",
                    write_set.run.get("runId"),
                    exc,
                    backoff,
                )
                time.sleep(backoff)
                attempt += 1
            except Neo4jError as exc:
                logger.error("Failed to persist orchestration run: %s", exc)
                raise

    def _build_query(self) -> str:
        return """
        MERGE (req:UserRequest { requestId: $userRequest.requestId })
          ON CREATE SET req.payload = $userRequest.payload,
                        req.createdAt = $userRequest.createdAt

        MERGE (run:OrchestrationRun { runId: $run.runId })
          ON CREATE SET run.status = $run.status,
                        run.totalDuration = $run.totalDuration,
                        run.timestamp = $run.timestamp,
                        run.configSnapshot = $run.configSnapshot
          ON MATCH SET run.status = $run.status,
                      run.totalDuration = $run.totalDuration,
                      run.timestamp = $run.timestamp

        MERGE (recipe:RecipeVersion { recipeId: $recipeVersion.recipeId, version: $recipeVersion.version })
          ON CREATE SET recipe.name = $recipeVersion.name,
                        recipe.totalPercentage = $recipeVersion.totalPercentage,
                        recipe.metadata = $recipeVersion.metadata,
                        recipe.createdAt = $recipeVersion.createdAt

        MERGE (calc:CalculationResult { calculationId: $calculation.calculationId })
          ON CREATE SET calc.payload = $calculation.payload,
                        calc.createdAt = $calculation.createdAt
          ON MATCH SET calc.payload = $calculation.payload,
                      calc.updatedAt = timestamp()

        MERGE (graph:GraphSnapshot { graphId: $graphSnapshot.graphId })
          ON CREATE SET graph.metadata = $graphSnapshot.metadata,
                        graph.checksum = $graphSnapshot.checksum,
                        graph.blobUri = $graphSnapshot.blobUri,
                        graph.createdAt = $graphSnapshot.createdAt
          ON MATCH SET graph.metadata = $graphSnapshot.metadata,
                      graph.checksum = $graphSnapshot.checksum,
                      graph.blobUri = $graphSnapshot.blobUri,
                      graph.updatedAt = timestamp()

        MERGE (validation:ValidationReport { validationId: $validation.validationId })
          ON CREATE SET validation.payload = $validation.payload,
                        validation.createdAt = $validation.createdAt,
                        validation.valid = $validation.valid
          ON MATCH SET validation.payload = $validation.payload,
                      validation.valid = $validation.valid,
                      validation.updatedAt = timestamp()

        MERGE (ui:UIConfig { uiConfigId: $uiConfig.uiConfigId })
          ON CREATE SET ui.payload = $uiConfig.payload,
                        ui.createdAt = $uiConfig.createdAt
          ON MATCH SET ui.payload = $uiConfig.payload,
                      ui.updatedAt = timestamp()

        MERGE (req)-[:TRIGGERED]->(run)
        MERGE (run)-[:USED_RECIPE]->(recipe)
        MERGE (run)-[:PRODUCED_CALCULATION]->(calc)
        MERGE (run)-[:PRODUCED_GRAPH]->(graph)
        MERGE (run)-[:PRODUCED_VALIDATION]->(validation)
        MERGE (run)-[:PRODUCED_UI]->(ui)

        WITH run
        UNWIND $agentInvocations AS agentInvocation
        MERGE (agent:AgentInvocation { runId: run.runId, sequence: agentInvocation.sequence })
          ON CREATE SET agent.agentName = agentInvocation.agentName,
                        agent.duration = agentInvocation.duration,
                        agent.status = agentInvocation.status,
                        agent.error = agentInvocation.error,
                        agent.createdAt = agentInvocation.createdAt
          ON MATCH SET agent.duration = agentInvocation.duration,
                      agent.status = agentInvocation.status,
                      agent.error = agentInvocation.error,
                      agent.updatedAt = timestamp()
        MERGE (run)-[:HAS_AGENT_INVOCATION]->(agent)
        """

    def _snapshot_to_parameters(self, write_set: GraphWriteSet) -> Dict[str, Any]:
        run = dict(write_set.run)
        run["configSnapshot"] = _encode_property(run.get("configSnapshot"))

        recipe_version = dict(write_set.recipe_version)
        recipe_version["metadata"] = _encode_property(recipe_version.get("metadata"))

        calculation = dict(write_set.calculation)
        calculation["payload"] = _encode_property(calculation.get("payload"))

        graph_snapshot = dict(write_set.graph_snapshot)
        graph_snapshot["metadata"] = _encode_property(graph_snapshot.get("metadata"))

        validation = dict(write_set.validation)
        validation["payload"] = _encode_property(validation.get("payload"))

        ui_config = dict(write_set.ui_config)
        ui_config["payload"] = _encode_property(ui_config.get("payload"))

        agent_invocations = [dict(agent) for agent in write_set.agent_invocations]

        return {
            "run": run,
            "userRequest": write_set.user_request,
            "recipeVersion": recipe_version,
            "calculation": calculation,
            "graphSnapshot": graph_snapshot,
            "validation": validation,
            "uiConfig": ui_config,
            "agentInvocations": agent_invocations,
        }


def _encode_property(value: Any) -> Any:
    """Ensure values assigned to Neo4j properties are primitives or serialized JSON strings."""

    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
        except TypeError:
            return json.dumps(_stringify_unknown(value), sort_keys=True, separators=(",", ":"))

    return str(value)


def _stringify_unknown(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _stringify_unknown(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_stringify_unknown(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
