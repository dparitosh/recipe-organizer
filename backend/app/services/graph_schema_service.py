import copy
import json
import logging
import math
from typing import Any, Dict, Optional
from xml.etree.ElementTree import Element, SubElement, tostring

from app.db.neo4j_client import Neo4jClient

logger = logging.getLogger(__name__)


class GraphSchemaService:
    """Manage access to configurable graph schema metadata stored in Neo4j."""

    DEFAULT_SCHEMA: Dict[str, Any] = {
        "name": "FormulationGraph",
        "version": "1.0.0",
        "description": "Default schema used when GraphSchema metadata is not present in Neo4j.",
        "defaults": {
            "node": {
                "color": "#1e293b",
                "shape": "round-rectangle",
                "size": 68,
            },
            "edge": {
                "color": "#2563eb",
                "style": "solid",
                "width": 2,
                "target_arrow": "triangle",
            },
        },
        "node_types": [
            {
                "type": "Formulation",
                "label": "Formulation",
                "color": "#1d4ed8",
                "shape": "hexagon",
                "size": 92,
                "icon": "Flask",
            },
            {
                "type": "Ingredient",
                "label": "Ingredient",
                "color": "#0ea5e9",
                "shape": "roundrectangle",
                "size": 84,
                "icon": "Leaf",
            },
            {
                "type": "Nutrient",
                "label": "Nutrient",
                "color": "#0f766e",
                "shape": "diamond",
                "size": 78,
                "icon": "Activity",
            },
            {
                "type": "ProcessStep",
                "label": "Process Step",
                "color": "#4338ca",
                "shape": "hexagon",
                "size": 80,
                "icon": "GearSix",
            },
            {
                "type": "Supplier",
                "label": "Supplier",
                "color": "#2563eb",
                "shape": "rectangle",
                "size": 76,
                "icon": "Factory",
            },
            {
                "type": "Plant",
                "label": "Plant",
                "color": "#0284c7",
                "shape": "round-diamond",
                "size": 76,
                "icon": "Factory",
            },
            {
                "type": "AIInsight",
                "label": "AI Insight",
                "color": "#7c3aed",
                "shape": "ellipse",
                "size": 72,
                "icon": "Sparkle",
            },
            {
                "type": "CalculationSnapshot",
                "label": "Calculation Snapshot",
                "color": "#4c1d95",
                "shape": "rectangle",
                "size": 74,
                "icon": "Calculator",
            },
        ],
        "relationship_types": [
            {
                "type": "USES",
                "label": "Uses",
                "color": "#2563eb",
                "style": "solid",
                "width": 3,
                "target_arrow": "triangle",
                "allowed_source_types": ["Formulation"],
                "allowed_target_types": ["Ingredient"],
            },
            {
                "type": "HAS_NUTRIENT",
                "label": "Has Nutrient",
                "color": "#0f766e",
                "style": "solid",
                "width": 2,
                "target_arrow": "triangle",
                "allowed_source_types": ["Ingredient", "Formulation"],
                "allowed_target_types": ["Nutrient"],
            },
            {
                "type": "EXECUTES",
                "label": "Executes",
                "color": "#4338ca",
                "style": "dotted",
                "width": 2,
                "target_arrow": "triangle",
                "allowed_source_types": ["Formulation"],
                "allowed_target_types": ["ProcessStep"],
            },
            {
                "type": "PRODUCED_AT",
                "label": "Produced At",
                "color": "#0284c7",
                "style": "solid",
                "width": 2,
                "target_arrow": "triangle",
                "allowed_source_types": ["Formulation"],
                "allowed_target_types": ["Plant"],
            },
            {
                "type": "PROCURED_FROM",
                "label": "Procured From",
                "color": "#1d4ed8",
                "style": "dashed",
                "width": 2,
                "target_arrow": "triangle",
                "allowed_source_types": ["Ingredient"],
                "allowed_target_types": ["Supplier"],
            },
            {
                "type": "APPLIES_TO",
                "label": "Applies To",
                "color": "#7c3aed",
                "style": "solid",
                "width": 2,
                "target_arrow": "triangle",
                "allowed_source_types": ["CalculationSnapshot"],
                "allowed_target_types": ["Formulation"],
            },
            {
                "type": "SUPPORTS",
                "label": "Supports",
                "color": "#475569",
                "style": "solid",
                "width": 1.5,
                "target_arrow": "vee",
                "allowed_source_types": ["AIInsight"],
                "allowed_target_types": ["Formulation", "ProcessStep", "Ingredient"],
            },
        ],
    }

    def __init__(self, neo4j_client: Optional[Neo4jClient], schema_name: str) -> None:
        self._neo4j = neo4j_client
        self._schema_name = schema_name or self.DEFAULT_SCHEMA["name"]

    def _default_schema(self) -> Dict[str, Any]:
        """Return a deep copy so callers can mutate without affecting defaults."""
        default_copy = copy.deepcopy(self.DEFAULT_SCHEMA)
        default_copy["name"] = self._schema_name or default_copy["name"]
        return default_copy

    @staticmethod
    def _serialize_node(entity: Any) -> Dict[str, Any]:
        if entity is None:
            return {}
        try:
            data = dict(entity)
        except TypeError:
            return {}
        return data

    def get_schema(self) -> Dict[str, Any]:
        if not self._neo4j:
            logger.debug("Neo4j client unavailable, returning default graph schema")
            return self._default_schema()

        try:
            records = self._neo4j.execute_query(
                (
                    "MATCH (schema:GraphSchema {name: $name}) "
                    "OPTIONAL MATCH (schema)-[:DECLARES_NODE_TYPE]->(nodeType:GraphNodeType) "
                    "OPTIONAL MATCH (schema)-[:DECLARES_RELATIONSHIP_TYPE]->(relType:GraphRelationshipType) "
                    "RETURN schema, collect(DISTINCT nodeType) AS nodeTypes, collect(DISTINCT relType) AS relTypes"
                ),
                {"name": self._schema_name},
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("Failed to load graph schema metadata, using defaults: %s", exc)
            return self._default_schema()

        if not records:
            return self._default_schema()

        record = records[0]
        schema_node = self._serialize_node(record.get("schema"))
        node_types = [self._serialize_node(node) for node in record.get("nodeTypes", [])]
        rel_types = [self._serialize_node(rel) for rel in record.get("relTypes", [])]

        payload = self._default_schema()
        if schema_node:
            payload["name"] = schema_node.get("name", payload["name"])
            payload["version"] = schema_node.get("version", payload.get("version"))
            payload["description"] = schema_node.get("description", payload.get("description"))
            defaults_json = schema_node.get("defaultsJson") or schema_node.get("defaults")
            if isinstance(defaults_json, str):
                try:
                    payload["defaults"] = json.loads(defaults_json)
                except json.JSONDecodeError:  # pragma: no cover - tolerate legacy values
                    payload["defaults"] = payload.get("defaults", {})
            elif isinstance(defaults_json, dict):
                payload["defaults"] = defaults_json
            if schema_node.get("lastUpdated"):
                last_updated = schema_node["lastUpdated"]
                payload["last_updated"] = getattr(last_updated, "isoformat", lambda: last_updated)()

        parsed_node_types = [self._format_node_type(node) for node in node_types if node]
        parsed_relationship_types = [
            self._format_relationship_type(rel) for rel in rel_types if rel
        ]

        if parsed_node_types:
            payload["node_types"] = parsed_node_types
        if parsed_relationship_types:
            payload["relationship_types"] = parsed_relationship_types

        return payload

    def apply_schema(self, schema_payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self._neo4j:
            raise RuntimeError("Neo4j client is not available for schema updates")

        name = schema_payload.get("name") or self._schema_name
        node_types = schema_payload.get("node_types", [])
        relationship_types = schema_payload.get("relationship_types", [])
        defaults = schema_payload.get("defaults", {})
        defaults_json = json.dumps(defaults) if defaults else None

        parameters = {
            "schema": {
                "name": name,
                "version": schema_payload.get("version"),
                "description": schema_payload.get("description"),
                "defaults_json": defaults_json,
            },
            "node_types": [self._sanitize_node_type(nt) for nt in node_types],
            "relationship_types": [self._sanitize_relationship_type(rt) for rt in relationship_types],
            "node_type_keys": [nt.get("type") for nt in node_types if nt.get("type")],
            "relationship_type_keys": [rt.get("type") for rt in relationship_types if rt.get("type")],
        }

        try:
            self._neo4j.execute_write(
                (
                    "MERGE (schema:GraphSchema {name: $schema.name}) "
                    "SET schema.version = $schema.version, "
                    "    schema.description = $schema.description, "
                    "    schema.defaultsJson = $schema.defaults_json, "
                    "    schema.lastUpdated = datetime() "
                    "WITH schema "
                    "CALL { "
                    "    WITH schema "
                    "    MATCH (schema)-[rel:DECLARES_NODE_TYPE]->(existing:GraphNodeType) "
                    "    WHERE size($node_type_keys) > 0 AND NOT existing.type IN $node_type_keys "
                    "    DELETE rel "
                    "    RETURN count(*) AS removedNodeRels "
                    "} "
                    "CALL { "
                    "    WITH schema "
                    "    MATCH (schema)-[rel:DECLARES_RELATIONSHIP_TYPE]->(existing:GraphRelationshipType) "
                    "    WHERE size($relationship_type_keys) > 0 AND NOT existing.type IN $relationship_type_keys "
                    "    DELETE rel "
                    "    RETURN count(*) AS removedRelRels "
                    "} "
                    "WITH schema "
                    "UNWIND $node_types AS nodeType "
                    "MERGE (nt:GraphNodeType {type: nodeType.type}) "
                    "SET nt.label = nodeType.label, "
                    "    nt.color = nodeType.color, "
                    "    nt.shape = nodeType.shape, "
                    "    nt.icon = nodeType.icon, "
                    "    nt.size = nodeType.size, "
                    "    nt.defaults = nodeType.defaults, "
                    "    nt.metadata = nodeType.metadata "
                    "MERGE (schema)-[:DECLARES_NODE_TYPE]->(nt) "
                    "WITH schema "
                    "UNWIND $relationship_types AS relType "
                    "MERGE (rt:GraphRelationshipType {type: relType.type}) "
                    "SET rt.label = relType.label, "
                    "    rt.color = relType.color, "
                    "    rt.style = relType.style, "
                    "    rt.width = relType.width, "
                    "    rt.targetArrow = relType.target_arrow, "
                    "    rt.sourceArrow = relType.source_arrow, "
                    "    rt.defaults = relType.defaults, "
                    "    rt.allowedSourceTypes = relType.allowed_source_types, "
                    "    rt.allowedTargetTypes = relType.allowed_target_types, "
                    "    rt.metadata = relType.metadata "
                    "MERGE (schema)-[:DECLARES_RELATIONSHIP_TYPE]->(rt) "
                    "RETURN schema.name AS name"
                ),
                parameters,
            )
        except Exception as exc:
            logger.error("Failed to apply graph schema to Neo4j: %s", exc)
            raise

        self._schema_name = name
        return self.get_schema()

    def install_default_schema(self) -> Dict[str, Any]:
        """Persist the built-in default schema to Neo4j."""

        default_payload = self._default_schema()
        return self.apply_schema(default_payload)

    def export_schema_graphml(self) -> str:
        """Return the current schema encoded as GraphML."""

        schema = self.get_schema()
        return self._schema_to_graphml(schema)

    def export_schema_svg(self) -> str:
        """Return a compact SVG legend for the current schema."""

        schema = self.get_schema()
        return self._schema_to_svg(schema)

    @staticmethod
    def _format_node_type(node: Dict[str, Any]) -> Dict[str, Any]:
        defaults_value = node.get("defaults")
        if isinstance(defaults_value, str):
            try:
                defaults_value = json.loads(defaults_value)
            except json.JSONDecodeError:
                defaults_value = {}
        elif not isinstance(defaults_value, dict):
            defaults_value = {}

        metadata_value = node.get("metadata")
        if isinstance(metadata_value, str):
            try:
                metadata_value = json.loads(metadata_value)
            except json.JSONDecodeError:
                metadata_value = {}
        elif not isinstance(metadata_value, dict):
            metadata_value = {}

        return {
            "type": node.get("type") or node.get("key"),
            "label": node.get("label"),
            "color": node.get("color"),
            "shape": node.get("shape"),
            "icon": node.get("icon"),
            "size": node.get("size"),
            "defaults": defaults_value,
            "metadata": metadata_value,
        }

    @staticmethod
    def _format_relationship_type(rel: Dict[str, Any]) -> Dict[str, Any]:
        defaults_value = rel.get("defaults")
        if isinstance(defaults_value, str):
            try:
                defaults_value = json.loads(defaults_value)
            except json.JSONDecodeError:
                defaults_value = {}
        elif not isinstance(defaults_value, dict):
            defaults_value = {}

        metadata_value = rel.get("metadata")
        if isinstance(metadata_value, str):
            try:
                metadata_value = json.loads(metadata_value)
            except json.JSONDecodeError:
                metadata_value = {}
        elif not isinstance(metadata_value, dict):
            metadata_value = {}

        return {
            "type": rel.get("type"),
            "label": rel.get("label"),
            "color": rel.get("color"),
            "style": rel.get("style"),
            "width": rel.get("width"),
            "target_arrow": rel.get("targetArrow") or rel.get("target_arrow"),
            "source_arrow": rel.get("sourceArrow") or rel.get("source_arrow"),
            "defaults": defaults_value,
            "allowed_source_types": rel.get("allowedSourceTypes", []),
            "allowed_target_types": rel.get("allowedTargetTypes", []),
            "metadata": metadata_value,
        }

    @staticmethod
    def _sanitize_node_type(node: Dict[str, Any]) -> Dict[str, Any]:
        defaults_value = node.get("defaults", {})
        defaults_serialized = json.dumps(defaults_value) if isinstance(defaults_value, dict) and defaults_value else None

        metadata_value = node.get("metadata", {})
        metadata_serialized = json.dumps(metadata_value) if isinstance(metadata_value, dict) and metadata_value else None

        return {
            "type": node.get("type"),
            "label": node.get("label"),
            "color": node.get("color"),
            "shape": node.get("shape"),
            "icon": node.get("icon"),
            "size": node.get("size"),
            "defaults": defaults_serialized,
            "metadata": metadata_serialized,
        }

    @staticmethod
    def _sanitize_relationship_type(rel: Dict[str, Any]) -> Dict[str, Any]:
        defaults_value = rel.get("defaults", {})
        defaults_serialized = json.dumps(defaults_value) if isinstance(defaults_value, dict) and defaults_value else None

        metadata_value = rel.get("metadata", {})
        metadata_serialized = json.dumps(metadata_value) if isinstance(metadata_value, dict) and metadata_value else None

        return {
            "type": rel.get("type"),
            "label": rel.get("label"),
            "color": rel.get("color"),
            "style": rel.get("style"),
            "width": rel.get("width"),
            "target_arrow": rel.get("target_arrow") or rel.get("targetArrow"),
            "source_arrow": rel.get("source_arrow") or rel.get("sourceArrow"),
            "defaults": defaults_serialized,
            "allowed_source_types": rel.get("allowed_source_types")
            or rel.get("allowedSourceTypes")
            or [],
            "allowed_target_types": rel.get("allowed_target_types")
            or rel.get("allowedTargetTypes")
            or [],
            "metadata": metadata_serialized,
        }

    @staticmethod
    def _schema_to_graphml(schema: Dict[str, Any]) -> str:
        root = Element(
            "graphml",
            attrib={"xmlns": "http://graphml.graphdrawing.org/xmlns"},
        )

        key_specs = [
            ("g_name", "graph", "name", "string"),
            ("g_version", "graph", "version", "string"),
            ("g_description", "graph", "description", "string"),
            ("g_defaults", "graph", "defaults", "string"),
            ("n_label", "node", "label", "string"),
            ("n_color", "node", "color", "string"),
            ("n_shape", "node", "shape", "string"),
            ("n_icon", "node", "icon", "string"),
            ("n_size", "node", "size", "double"),
            ("n_defaults", "node", "defaults", "string"),
            ("n_metadata", "node", "metadata", "string"),
            ("e_type", "edge", "type", "string"),
            ("e_label", "edge", "label", "string"),
            ("e_color", "edge", "color", "string"),
            ("e_style", "edge", "style", "string"),
            ("e_width", "edge", "width", "double"),
            ("e_target_arrow", "edge", "target_arrow", "string"),
            ("e_source_arrow", "edge", "source_arrow", "string"),
            ("e_defaults", "edge", "defaults", "string"),
            ("e_metadata", "edge", "metadata", "string"),
            ("e_sources", "edge", "allowed_source_types", "string"),
            ("e_targets", "edge", "allowed_target_types", "string"),
        ]

        for key_id, key_for, name, attr_type in key_specs:
            SubElement(
                root,
                "key",
                attrib={
                    "id": key_id,
                    "for": key_for,
                    "attr.name": name,
                    "attr.type": attr_type,
                },
            )

        graph_elem = SubElement(
            root,
            "graph",
            attrib={
                "id": schema.get("name") or "GraphSchema",
                "edgedefault": "directed",
            },
        )

        GraphSchemaService._set_data(graph_elem, "g_name", schema.get("name"))
        GraphSchemaService._set_data(graph_elem, "g_version", schema.get("version"))
        GraphSchemaService._set_data(graph_elem, "g_description", schema.get("description"))
        GraphSchemaService._set_data(
            graph_elem,
            "g_defaults",
            json.dumps(schema.get("defaults", {}), separators=(",", ":")),
        )

        node_types = schema.get("node_types", [])
        for node in node_types:
            node_id = node.get("type") or node.get("label")
            if not node_id:
                continue
            node_elem = SubElement(graph_elem, "node", attrib={"id": node_id})
            GraphSchemaService._set_data(node_elem, "n_label", node.get("label"))
            GraphSchemaService._set_data(node_elem, "n_color", node.get("color"))
            GraphSchemaService._set_data(node_elem, "n_shape", node.get("shape"))
            GraphSchemaService._set_data(node_elem, "n_icon", node.get("icon"))
            GraphSchemaService._set_data(node_elem, "n_size", node.get("size"))
            GraphSchemaService._set_data(
                node_elem,
                "n_defaults",
                json.dumps(node.get("defaults", {}), separators=(",", ":")),
            )
            GraphSchemaService._set_data(
                node_elem,
                "n_metadata",
                json.dumps(node.get("metadata", {}), separators=(",", ":")),
            )

        relationship_types = schema.get("relationship_types", [])
        for rel in relationship_types:
            rel_type = rel.get("type")
            if not rel_type:
                continue
            sources = rel.get("allowed_source_types") or []
            targets = rel.get("allowed_target_types") or []
            if not sources:
                sources = [rel_type]
            if not targets:
                targets = [rel_type]

            for index, source in enumerate(sources):
                for target in targets:
                    edge_elem = SubElement(
                        graph_elem,
                        "edge",
                        attrib={
                            "id": f"{rel_type}__{index}_{target}",
                            "source": source,
                            "target": target,
                        },
                    )
                    GraphSchemaService._set_data(edge_elem, "e_type", rel_type)
                    GraphSchemaService._set_data(edge_elem, "e_label", rel.get("label"))
                    GraphSchemaService._set_data(edge_elem, "e_color", rel.get("color"))
                    GraphSchemaService._set_data(edge_elem, "e_style", rel.get("style"))
                    GraphSchemaService._set_data(edge_elem, "e_width", rel.get("width"))
                    GraphSchemaService._set_data(
                        edge_elem,
                        "e_target_arrow",
                        rel.get("target_arrow") or rel.get("targetArrow"),
                    )
                    GraphSchemaService._set_data(
                        edge_elem,
                        "e_source_arrow",
                        rel.get("source_arrow") or rel.get("sourceArrow"),
                    )
                    GraphSchemaService._set_data(
                        edge_elem,
                        "e_defaults",
                        json.dumps(rel.get("defaults", {}), separators=(",", ":")),
                    )
                    GraphSchemaService._set_data(
                        edge_elem,
                        "e_metadata",
                        json.dumps(rel.get("metadata", {}), separators=(",", ":")),
                    )
                    GraphSchemaService._set_data(
                        edge_elem,
                        "e_sources",
                        json.dumps(sources, separators=(",", ":")),
                    )
                    GraphSchemaService._set_data(
                        edge_elem,
                        "e_targets",
                        json.dumps(targets, separators=(",", ":")),
                    )

        graphml_xml = tostring(root, encoding="unicode")
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + graphml_xml

    @staticmethod
    def _schema_to_svg(schema: Dict[str, Any]) -> str:
        node_types = schema.get("node_types", [])
        relationship_types = schema.get("relationship_types", [])

        margin = 16
        row_height = 72
        rel_row_height = 48
        column_width = 360

        nodes_height = max(len(node_types), 1) * row_height
        relationships_height = len(relationship_types) * rel_row_height
        legend_gap = 24 if relationship_types else 0
        total_height = margin * 2 + nodes_height + legend_gap + relationships_height

        svg = Element(
            "svg",
            attrib={
                "xmlns": "http://www.w3.org/2000/svg",
                "width": str(column_width + margin * 2),
                "height": str(total_height),
                "viewBox": f"0 0 {column_width + margin * 2} {total_height}",
            },
        )

        defs = SubElement(svg, "defs")
        GraphSchemaService._define_svg_markers(defs)

        title = SubElement(
            svg,
            "text",
            attrib={
                "x": str(margin),
                "y": str(margin - 4 if margin > 12 else 12),
                "font-size": "18",
                "font-family": "Inter, Arial, sans-serif",
                "font-weight": "600",
                "fill": "#111827",
            },
        )
        title.text = schema.get("name") or "Graph Schema"

        for index, node in enumerate(node_types or [{}]):
            group = SubElement(
                svg,
                "g",
                attrib={
                    "transform": f"translate({margin},{margin + index * row_height + 16})",
                },
            )
            GraphSchemaService._append_node_shape(group, node, 32, 20)

            label_text = node.get("label") or node.get("type") or "Node"
            details = f"type={node.get('type', 'n/a')} shape={node.get('shape', 'ellipse')}"

            label = SubElement(
                group,
                "text",
                attrib={
                    "x": "72",
                    "y": "18",
                    "font-size": "15",
                    "font-family": "Inter, Arial, sans-serif",
                    "font-weight": "600",
                    "fill": "#111827",
                },
            )
            label.text = label_text

            meta = SubElement(
                group,
                "text",
                attrib={
                    "x": "72",
                    "y": "40",
                    "font-size": "12",
                    "font-family": "Inter, Arial, sans-serif",
                    "fill": "#4B5563",
                },
            )
            meta.text = details

        start_y = margin + nodes_height + legend_gap
        for index, rel in enumerate(relationship_types):
            group = SubElement(
                svg,
                "g",
                attrib={
                    "transform": f"translate({margin},{start_y + index * rel_row_height + 12})",
                },
            )

            color = rel.get("color") or "#2563EB"
            style = rel.get("style") or "solid"
            marker_id = GraphSchemaService._pick_marker(rel.get("target_arrow"))
            line = SubElement(
                group,
                "line",
                attrib={
                    "x1": "0",
                    "y1": "12",
                    "x2": "80",
                    "y2": "12",
                    "stroke": color,
                    "stroke-width": str(rel.get("width") or 2),
                },
            )
            if style == "dashed":
                line.set("stroke-dasharray", "6 6")
            elif style == "dotted":
                line.set("stroke-dasharray", "2 4")
            if marker_id:
                line.set("marker-end", f"url(#{marker_id})")

            label = SubElement(
                group,
                "text",
                attrib={
                    "x": "92",
                    "y": "16",
                    "font-size": "14",
                    "font-family": "Inter, Arial, sans-serif",
                    "font-weight": "600",
                    "fill": "#111827",
                },
            )
            label.text = rel.get("label") or rel.get("type") or "Relationship"

            details = SubElement(
                group,
                "text",
                attrib={
                    "x": "92",
                    "y": "32",
                    "font-size": "12",
                    "font-family": "Inter, Arial, sans-serif",
                    "fill": "#4B5563",
                },
            )
            details.text = (
                f"{', '.join(rel.get('allowed_source_types') or ['*'])}"  # sources
                + " → "
                + f"{', '.join(rel.get('allowed_target_types') or ['*'])}"
            )

        return tostring(svg, encoding="unicode")

    @staticmethod
    def _set_data(parent: Element, key: str, value: Any) -> None:
        if value is None:
            return
        data_elem = SubElement(parent, "data", attrib={"key": key})
        data_elem.text = str(value)

    @staticmethod
    def _append_node_shape(parent: Element, node: Dict[str, Any], center_x: float, center_y: float) -> None:
        color = node.get("color") or "#2563EB"
        shape = (node.get("shape") or "ellipse").lower()
        size = node.get("size") or 64
        radius = max(min(size, 128), 32) / 4

        if shape in {"circle", "ellipse"}:
            SubElement(
                parent,
                "circle",
                attrib={
                    "cx": str(center_x),
                    "cy": str(center_y),
                    "r": str(radius),
                    "fill": color,
                    "stroke": "#111827",
                    "stroke-width": "1.5",
                },
            )
        elif shape in {"rectangle", "roundrectangle"}:
            rx = radius * 0.4 if shape == "roundrectangle" else 0
            SubElement(
                parent,
                "rect",
                attrib={
                    "x": str(center_x - radius),
                    "y": str(center_y - radius),
                    "width": str(radius * 2),
                    "height": str(radius * 2),
                    "rx": str(rx),
                    "ry": str(rx),
                    "fill": color,
                    "stroke": "#111827",
                    "stroke-width": "1.5",
                },
            )
        elif shape in {"diamond", "round-diamond"}:
            points = GraphSchemaService._diamond_points(center_x, center_y, radius)
            SubElement(
                parent,
                "polygon",
                attrib={
                    "points": points,
                    "fill": color,
                    "stroke": "#111827",
                    "stroke-width": "1.5",
                },
            )
        elif shape == "hexagon":
            points = GraphSchemaService._regular_polygon_points(center_x, center_y, radius, 6)
            SubElement(
                parent,
                "polygon",
                attrib={
                    "points": points,
                    "fill": color,
                    "stroke": "#111827",
                    "stroke-width": "1.5",
                },
            )
        else:
            SubElement(
                parent,
                "circle",
                attrib={
                    "cx": str(center_x),
                    "cy": str(center_y),
                    "r": str(radius),
                    "fill": color,
                    "stroke": "#111827",
                    "stroke-width": "1.5",
                },
            )

    @staticmethod
    def _diamond_points(cx: float, cy: float, radius: float) -> str:
        points = [
            f"{cx},{cy - radius}",
            f"{cx + radius},{cy}",
            f"{cx},{cy + radius}",
            f"{cx - radius},{cy}",
        ]
        return " ".join(points)

    @staticmethod
    def _regular_polygon_points(cx: float, cy: float, radius: float, sides: int) -> str:
        if sides < 3:
            return GraphSchemaService._diamond_points(cx, cy, radius)
        points = []
        for index in range(sides):
            angle = (2 * math.pi * index) / sides - math.pi / 2
            x = cx + radius * math.cos(angle)
            y = cy + radius * math.sin(angle)
            points.append(f"{x},{y}")
        return " ".join(points)

    @staticmethod
    def _define_svg_markers(defs: Element) -> None:
        markers = {
            "triangle": "M0,0 L10,5 L0,10 z",
            "vee": "M0,0 L10,5 L0,10",
        }
        for marker_type, path in markers.items():
            marker = SubElement(
                defs,
                "marker",
                attrib={
                    "id": f"arrow-{marker_type}",
                    "viewBox": "0 0 10 10",
                    "refX": "10",
                    "refY": "5",
                    "markerWidth": "6",
                    "markerHeight": "6",
                    "orient": "auto-start-reverse",
                    "markerUnits": "strokeWidth",
                },
            )
            SubElement(
                marker,
                "path",
                attrib={
                    "d": path,
                    "fill": "context-stroke" if marker_type == "triangle" else "none",
                    "stroke": "context-stroke",
                    "stroke-width": "1.5",
                },
            )

    @staticmethod
    def _pick_marker(arrow_type: Optional[str]) -> Optional[str]:
        if not arrow_type:
            return None
        arrow_lower = arrow_type.lower()
        if arrow_lower in {"triangle", "vee"}:
            return f"arrow-{arrow_lower}"
        return None
