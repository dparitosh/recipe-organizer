import cytoscape from 'cytoscape'

export const cytoscapeStyles = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '12px',
      'font-weight': 600,
      color: '#fff',
      'text-outline-color': '#000',
      'text-outline-width': 2,
      'text-wrap': 'wrap',
      'text-max-width': '100px',
    },
  },
  {
    selector: 'node[type="formulation"]',
    style: {
      'background-color': 'oklch(0.65 0.18 145)',
      shape: 'ellipse',
      width: 100,
      height: 100,
      'border-width': 3,
      'border-color': 'oklch(0.55 0.18 145)',
    },
  },
  {
    selector: 'node[type="ingredient"]',
    style: {
      'background-color': 'oklch(0.60 0.16 250)',
      shape: 'roundrectangle',
      width: 80,
      height: 80,
      'border-width': 2,
      'border-color': 'oklch(0.50 0.16 250)',
    },
  },
  {
    selector: 'node[type="nutrient"]',
    style: {
      'background-color': 'oklch(0.70 0.18 50)',
      shape: 'diamond',
      width: 60,
      height: 60,
      'border-width': 2,
      'border-color': 'oklch(0.60 0.18 50)',
    },
  },
  {
    selector: 'node[type="process"]',
    style: {
      'background-color': 'oklch(0.55 0.14 300)',
      shape: 'hexagon',
      width: 70,
      height: 70,
      'border-width': 2,
      'border-color': 'oklch(0.45 0.14 300)',
    },
  },
  {
    selector: 'node[type="supplier"]',
    style: {
      'background-color': 'oklch(0.68 0.12 180)',
      shape: 'rectangle',
      width: 70,
      height: 70,
      'border-width': 2,
      'border-color': 'oklch(0.58 0.12 180)',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 4,
      'border-color': 'oklch(0.70 0.18 50)',
      'background-color': 'data(selectedColor)',
    },
  },
  {
    selector: 'node:active',
    style: {
      'overlay-color': 'oklch(0.70 0.18 50)',
      'overlay-opacity': 0.2,
      'overlay-padding': 8,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': 'oklch(0.50 0.02 250)',
      'target-arrow-color': 'oklch(0.50 0.02 250)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.2,
    },
  },
  {
    selector: 'edge[type="CONTAINS"]',
    style: {
      'line-color': 'oklch(0.65 0.18 145)',
      'target-arrow-color': 'oklch(0.65 0.18 145)',
      width: 3,
      'line-style': 'solid',
    },
  },
  {
    selector: 'edge[type="DERIVED_FROM"]',
    style: {
      'line-color': 'oklch(0.60 0.16 250)',
      'target-arrow-color': 'oklch(0.60 0.16 250)',
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3],
    },
  },
  {
    selector: 'edge[type="REQUIRES"]',
    style: {
      'line-color': 'oklch(0.55 0.14 300)',
      'target-arrow-color': 'oklch(0.55 0.14 300)',
      'line-style': 'dotted',
    },
  },
  {
    selector: 'edge[type="ENRICHES"]',
    style: {
      'line-color': 'oklch(0.70 0.18 50)',
      'target-arrow-color': 'oklch(0.70 0.18 50)',
      width: 1.5,
      opacity: 0.6,
    },
  },
  {
    selector: 'edge[type="ALTERNATIVE"]',
    style: {
      'line-color': 'oklch(0.68 0.12 180)',
      'target-arrow-color': 'oklch(0.68 0.12 180)',
      'source-arrow-color': 'oklch(0.68 0.12 180)',
      'source-arrow-shape': 'triangle',
      'line-style': 'dashed',
      'line-dash-pattern': [3, 3],
    },
  },
  {
    selector: 'edge[type="SIMILAR_TO"]',
    style: {
      'line-color': 'oklch(0.75 0.08 100)',
      'target-arrow-shape': 'none',
      width: 1.5,
      opacity: 0.5,
    },
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': 'oklch(0.70 0.18 50)',
      'target-arrow-color': 'oklch(0.70 0.18 50)',
      width: 4,
    },
  },
  {
    selector: 'edge[label]',
    style: {
      label: 'data(label)',
      'font-size': '10px',
      'text-background-color': '#000',
      'text-background-opacity': 0.7,
      'text-background-padding': '3px',
      color: '#fff',
    },
  },
]

export const cytoscapeLayouts = {
  hierarchical: {
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  },
  force: {
    name: 'cose',
    animate: true,
    animationDuration: 500,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 1.2,
    gravity: 1,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  },
  circular: {
    name: 'circle',
    avoidOverlap: true,
    spacingFactor: 1.2,
  },
  grid: {
    name: 'grid',
    avoidOverlap: true,
    avoidOverlapPadding: 20,
    condense: true,
    rows: undefined,
    cols: undefined,
  },
  concentric: {
    name: 'concentric',
    concentric(node) {
      return node.data('type') === 'formulation' ? 2 : 1
    },
    levelWidth() {
      return 2
    },
    avoidOverlap: true,
    spacingFactor: 1.5,
  },
}

export function createCytoscapeConfig(container) {
  return {
    container,
    style: cytoscapeStyles,
    layout: cytoscapeLayouts.hierarchical,
    minZoom: 0.3,
    maxZoom: 3,
    wheelSensitivity: 0.2,
    boxSelectionEnabled: true,
    selectionType: 'single',
  }
}

export function addFormulationNode(cy, id, label, data) {
  return cy.add({
    group: 'nodes',
    data: {
      id,
      label,
      type: 'formulation',
      selectedColor: 'oklch(0.70 0.20 145)',
      ...data,
    },
  })
}

export function addIngredientNode(cy, id, label, data) {
  return cy.add({
    group: 'nodes',
    data: {
      id,
      label,
      type: 'ingredient',
      selectedColor: 'oklch(0.65 0.18 250)',
      ...data,
    },
  })
}

export function addEdge(cy, source, target, edgeType, label, data) {
  return cy.add({
    group: 'edges',
    data: {
      id: `${source}-${target}-${Date.now()}`,
      source,
      target,
      type: edgeType,
      label,
      ...data,
    },
  })
}

export function applyLayout(cy, layoutName) {
  const layout = cytoscapeLayouts[layoutName]
  cy.layout(layout).run()
}

export function fitToView(cy, padding = 50) {
  cy.fit(undefined, padding)
}

export function centerOnNode(cy, nodeId, zoom) {
  const node = cy.getElementById(nodeId)
  if (node.length > 0) {
    cy.animate({
      center: { eles: node },
      zoom,
      duration: 500,
    })
  }
}

export function exportGraphImage(cy, format = 'png') {
  return cy.png({
    output: 'base64',
    bg: 'oklch(0.25 0.01 250)',
    full: true,
    scale: 2,
  })
}

export function exportGraphJSON(cy) {
  return cy.json()
}

export function importGraphJSON(cy, json) {
  cy.json(json)
  applyLayout(cy, 'hierarchical')
}
