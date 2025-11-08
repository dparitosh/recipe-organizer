import sys
from pathlib import Path
import xml.etree.ElementTree as ET

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.graph_schema_service import GraphSchemaService  # type: ignore[import]  # noqa: E402


def test_export_schema_graphml_structure():
    service = GraphSchemaService(None, "SchemaTest")
    graphml = service.export_schema_graphml()

    root = ET.fromstring(graphml)
    ns = {"g": "http://graphml.graphdrawing.org/xmlns"}

    graph_elem = root.find("g:graph", ns)
    assert graph_elem is not None
    assert graph_elem.get("id") == "SchemaTest"

    node_ids = {node.get("id") for node in graph_elem.findall("g:node", ns)}
    assert "Formulation" in node_ids

    defaults_data = graph_elem.find("g:data[@key='g_defaults']", ns)
    assert defaults_data is not None
    assert "node" in defaults_data.text


def test_export_schema_graphml_edges_contain_metadata():
    service = GraphSchemaService(None, "SchemaTest")
    graphml = service.export_schema_graphml()

    root = ET.fromstring(graphml)
    ns = {"g": "http://graphml.graphdrawing.org/xmlns"}

    graph_elem = root.find("g:graph", ns)
    edges = graph_elem.findall("g:edge", ns)
    assert edges, "GraphML export did not include any edges"

    first_edge = edges[0]
    edge_type = first_edge.find("g:data[@key='e_type']", ns)
    assert edge_type is not None
    assert edge_type.text

    source_types = first_edge.find("g:data[@key='e_sources']", ns)
    target_types = first_edge.find("g:data[@key='e_targets']", ns)
    assert source_types is not None and target_types is not None
    assert source_types.text.startswith("[")
    assert target_types.text.startswith("[")


def test_export_schema_svg_contains_shapes_and_markers():
    service = GraphSchemaService(None, "SchemaTest")
    svg = service.export_schema_svg()

    root = ET.fromstring(svg)
    ns = {"svg": "http://www.w3.org/2000/svg"}

    assert root.tag.endswith("svg"), "SVG export did not produce an <svg> root"

    circles = root.findall(".//svg:circle", ns)
    polygons = root.findall(".//svg:polygon", ns)
    rectangles = root.findall(".//svg:rect", ns)
    assert circles or polygons or rectangles, "SVG export missing basic shapes"

    markers = root.findall(".//svg:marker", ns)
    assert any(marker.get("id") == "arrow-triangle" for marker in markers)

    lines = root.findall(".//svg:line", ns)
    assert any(line.get("marker-end") for line in lines)
