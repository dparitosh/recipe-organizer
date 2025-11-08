import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MagnifyingGlass,
  FunnelSimple,
  ArrowsOut,
  ArrowsIn,
  Camera,
  DownloadSimple,
  Circle,
  Square,
  Hexagon,
  Gear,
  MapPin,
  Tag,
  Path,
  X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils.js'

const NODE_TYPE_CONFIG = {
  Ingredient: {
    shape: 'ellipse',
    color: 'oklch(0.60 0.16 250)',
    icon: Circle,
    size: 60,
  },
  Recipe: {
    shape: 'roundrectangle',
    color: 'oklch(0.65 0.18 145)',
    icon: Square,
    size: 80,
  },
  Formulation: {
    shape: 'roundrectangle',
    color: 'oklch(0.65 0.18 145)',
    icon: Square,
    size: 80,
  },
  MasterRecipe: {
    shape: 'hexagon',
    color: 'oklch(0.68 0.18 85)',
    icon: Hexagon,
    size: 90,
  },
  ManufacturingRecipe: {
    shape: 'round-hexagon',
    color: 'oklch(0.62 0.16 320)',
    icon: Gear,
    size: 85,
  },
  Plant: {
    shape: 'round-diamond',
    color: 'oklch(0.64 0.14 160)',
    icon: MapPin,
    size: 70,
  },
  SalesOrder: {
    shape: 'round-tag',
    color: 'oklch(0.70 0.18 50)',
    icon: Tag,
    size: 65,
  },
  Food: {
    shape: 'ellipse',
    color: 'oklch(0.60 0.16 250)',
    icon: Circle,
    size: 60,
  },
  Nutrient: {
    shape: 'ellipse',
    color: 'oklch(0.55 0.14 120)',
    icon: Circle,
    size: 50,
  },
  FoodCategory: {
    shape: 'ellipse',
    color: 'oklch(0.58 0.12 180)',
    icon: Circle,
    size: 55,
  },
  Process: {
    shape: 'diamond',
    color: 'oklch(0.63 0.15 280)',
    icon: Gear,
    size: 65,
  },
}

const EDGE_TYPE_CONFIG = {
  uses: { color: 'oklch(0.65 0.18 145)', style: 'solid', width: 2 },
  USES: { color: 'oklch(0.65 0.18 145)', style: 'solid', width: 2 },
  USES_INGREDIENT: { color: 'oklch(0.65 0.18 145)', style: 'solid', width: 2 },
  derived_from: { color: 'oklch(0.60 0.16 250)', style: 'dashed', width: 2 },
  DERIVED_FROM: { color: 'oklch(0.60 0.16 250)', style: 'dashed', width: 2 },
  produces: { color: 'oklch(0.70 0.18 50)', style: 'solid', width: 3 },
  PRODUCES: { color: 'oklch(0.70 0.18 50)', style: 'solid', width: 3 },
  CONTAINS: { color: 'oklch(0.65 0.18 145)', style: 'solid', width: 2 },
  CONTAINS_NUTRIENT: { color: 'oklch(0.55 0.14 120)', style: 'solid', width: 1.5 },
  REQUIRES: { color: 'oklch(0.55 0.14 300)', style: 'dotted', width: 2 },
  REQUIRES_PROCESS: { color: 'oklch(0.63 0.15 280)', style: 'dotted', width: 2 },
  BELONGS_TO_CATEGORY: { color: 'oklch(0.58 0.12 180)', style: 'dashed', width: 1.5 },
}

const LAYOUTS = {
  hierarchical: {
    name: 'breadthfirst',
    directed: true,
    padding: 10,
    spacingFactor: 1.1,
    animate: true,
  },
  force: {
    name: 'cose',
    animate: true,
    animationDuration: 800,
  },
  circular: {
    name: 'circle',
    animate: true,
    animationDuration: 600,
  },
  concentric: {
    name: 'concentric',
    animate: true,
    animationDuration: 600,
    concentricLevels: 5,
  },
  grid: {
    name: 'grid',
    animate: true,
    animationDuration: 600,
    rows: undefined,
    cols: undefined,
  },
}

const filterNode = (node, query) => {
  if (!query) return true
  const nodeData = node.data()
  const searchFields = [nodeData.label, nodeData.nodeType, nodeData.id]
  return searchFields.some((field) => field?.toLowerCase().includes(query.toLowerCase()))
}

const getParentNodes = (node) =>
  node
    .incomers('node')
    .map((parent) => parent.id())

const getChildNodes = (node) =>
  node
    .outgoers('node')
    .map((child) => child.id())

export function RelationshipGraphViewer({ data, onNodeSelect, onRefresh, height = '70vh' }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterNodeType, setFilterNodeType] = useState('all')
  const [filterEdgeType, setFilterEdgeType] = useState('all')
  const [layout, setLayout] = useState('hierarchical')
  const [showFilters, setShowFilters] = useState(false)
  const [lineagePath, setLineagePath] = useState([])

  useEffect(() => {
    if (!containerRef.current) return

    const styles = [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '11px',
          'font-weight': '600',
          color: '#fff',
          'text-outline-color': '#000',
          'text-outline-width': 2,
          'text-wrap': 'wrap',
          'text-max-width': '90px',
          'min-zoomed-font-size': 8,
          'background-color': 'oklch(0.60 0.15 200)',
          shape: 'ellipse',
          width: 60,
          height: 60,
          'border-width': 3,
          'border-color': 'oklch(0.50 0.15 200)',
        },
      },
      ...Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => ({
        selector: `node[nodeType="${type}"]`,
        style: {
          'background-color': config.color,
          shape: config.shape,
          width: config.size,
          height: config.size,
          'border-width': 3,
          'border-color': config.color.replace(/oklch\(([^)]+)/, (match, values) => {
            const [lightness, ...rest] = values.split(' ')
            const newLightness = Math.max(0.3, parseFloat(lightness) - 0.15)
            return `oklch(${newLightness} ${rest.join(' ')}`
          }),
        },
      })),
      {
        selector: 'node:selected',
        style: {
          'border-width': 5,
          'border-color': 'oklch(0.70 0.18 50)',
          'background-color': 'data(selectedColor)',
          'z-index': 9999,
        },
      },
      {
        selector: 'node.highlighted',
        style: {
          'border-width': 5,
          'border-color': 'oklch(0.75 0.20 50)',
          'background-color': 'data(highlightColor)',
          'z-index': 9998,
        },
      },
      {
        selector: 'node.dimmed',
        style: {
          opacity: 0.3,
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
          opacity: 0.8,
        },
      },
      ...Object.entries(EDGE_TYPE_CONFIG).map(([type, config]) => ({
        selector: `edge[edgeType="${type}"]`,
        style: {
          'line-color': config.color,
          'target-arrow-color': config.color,
          'line-style': config.style,
          width: config.width,
        },
      })),
      {
        selector: 'edge:selected',
        style: {
          'line-color': 'oklch(0.70 0.18 50)',
          'target-arrow-color': 'oklch(0.70 0.18 50)',
          width: 4,
          'z-index': 9999,
        },
      },
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': 'oklch(0.75 0.20 50)',
          'target-arrow-color': 'oklch(0.75 0.20 50)',
          width: 4,
          'z-index': 9998,
          opacity: 1,
        },
      },
      {
        selector: 'edge.dimmed',
        style: {
          opacity: 0.15,
        },
      },
    ]

    cyRef.current = cytoscape({
      container: containerRef.current,
      style: styles,
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.15,
      boxSelectionEnabled: true,
      selectionType: 'single',
    })

    const cy = cyRef.current

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const nodeData = {
        id: node.id(),
        labels: [node.data('nodeType')],
        properties: node.data(),
      }
      setSelectedNode(nodeData)
      onNodeSelect?.(nodeData)
      highlightLineage(node.id())
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null)
        onNodeSelect?.(null)
        clearHighlights()
      }
    })

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      const tooltip = document.getElementById('graph-tooltip')
      if (tooltip) {
        tooltip.style.display = 'block'
        tooltip.innerHTML = `
          <div class="font-semibold">${node.data('label')}</div>
          <div class="text-xs text-muted-foreground">${node.data('nodeType')}</div>
        `
      }
    })

    cy.on('mouseout', 'node', () => {
      const tooltip = document.getElementById('graph-tooltip')
      if (tooltip) {
        tooltip.style.display = 'none'
      }
    })

    cy.on('mousemove', (evt) => {
      const tooltip = document.getElementById('graph-tooltip')
      if (tooltip && tooltip.style.display === 'block') {
        tooltip.style.left = `${evt.originalEvent.clientX + 10}px`
        tooltip.style.top = `${evt.originalEvent.clientY + 10}px`
      }
    })

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [onNodeSelect])

  useEffect(() => {
    if (!cyRef.current || !data) return

    const cy = cyRef.current
    cy.elements().remove()

    const nodesToAdd = data.nodes.map((node) => {
      const nodeType = node.labels[0]
      const config = NODE_TYPE_CONFIG[nodeType] || {
        shape: 'ellipse',
        color: 'oklch(0.60 0.15 200)',
        icon: Circle,
        size: 60,
      }

      return {
        group: 'nodes',
        data: {
          id: node.id,
          label:
            node.properties.name ||
            node.properties.description ||
            node.properties.id ||
            node.id,
          nodeType,
          selectedColor: config.color,
          highlightColor: config.color.replace(/oklch\(([^)]+)/, () => 'oklch(0.75 0.2 50)'),
          ...node.properties,
        },
      }
    })

    cy.add(nodesToAdd)

    const nodeIds = new Set(data.nodes.map((n) => n.id))

    const edgesToAdd = data.relationships
      .filter((rel) => {
        const hasSource = nodeIds.has(rel.startNode)
        const hasTarget = nodeIds.has(rel.endNode)

        if (!hasSource || !hasTarget) {
          console.warn(
            `Skipping edge ${rel.id}: source=${rel.startNode} exists=${hasSource}, target=${rel.endNode} exists=${hasTarget}`
          )
          return false
        }

        return true
      })
      .map((rel) => ({
        group: 'edges',
        data: {
          id: rel.id,
          source: rel.startNode,
          target: rel.endNode,
          edgeType: rel.type,
          label: rel.properties.label || '',
          ...rel.properties,
        },
      }))

    cy.add(edgesToAdd)

    applyLayout(layout)
    applyFilters()
  }, [data, layout])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, filterNodeType, filterEdgeType, lineagePath])

  const applyLayout = (nextLayout) => {
    if (!cyRef.current) return

    const layoutOptions = LAYOUTS[nextLayout]
    if (!layoutOptions) return

    cyRef.current.layout(layoutOptions).run()
  }

  const applyFilters = () => {
    if (!cyRef.current) return

    const cy = cyRef.current
    const query = searchQuery.trim()

    cy.nodes().forEach((node) => {
      const matchesSearch = filterNode(node, query)
      const matchesType = filterNodeType === 'all' || node.data('nodeType') === filterNodeType
      const inLineage = lineagePath.length === 0 || lineagePath.includes(node.id())

      if (matchesSearch && matchesType && inLineage) {
        node.removeClass('dimmed')
      } else {
        node.addClass('dimmed')
      }
    })

    cy.edges().forEach((edge) => {
      const matchesType = filterEdgeType === 'all' || edge.data('edgeType') === filterEdgeType
      const connectsHighlighted = edge.source().hasClass('dimmed') === false || edge.target().hasClass('dimmed') === false

      if (matchesType && connectsHighlighted) {
        edge.removeClass('dimmed')
      } else {
        edge.addClass('dimmed')
      }
    })
  }

  const clearHighlights = () => {
    if (!cyRef.current) return
    cyRef.current.elements().removeClass('highlighted dimmed')
    setLineagePath([])
  }

  const highlightLineage = (nodeId) => {
    if (!cyRef.current) return

    const cy = cyRef.current
    const node = cy.getElementById(nodeId)

    if (!node) return

    const lineage = new Set([nodeId])
    const parents = getParentNodes(node)
    const children = getChildNodes(node)

    parents.forEach((id) => lineage.add(id))
    children.forEach((id) => lineage.add(id))

    cy.elements().removeClass('highlighted dimmed')

    lineage.forEach((id) => {
      cy.getElementById(id).addClass('highlighted')
    })

    cy.edges().forEach((edge) => {
      if (lineage.has(edge.source().id()) && lineage.has(edge.target().id())) {
        edge.addClass('highlighted')
      } else {
        edge.addClass('dimmed')
      }
    })

    setLineagePath(Array.from(lineage))
  }

  const centerGraph = () => {
    cyRef.current?.fit()
  }

  const zoomIn = () => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }

  const zoomOut = () => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }

  const screenshotGraph = () => {
    if (!cyRef.current) return

    const pngData = cyRef.current.png({
      scale: 2,
      bg: '#ffffff',
      full: true,
    })

    const downloadLink = document.createElement('a')
    downloadLink.href = pngData
    downloadLink.download = `neo4j-graph-${new Date().toISOString()}.png`
    downloadLink.click()

    toast.success('Graph exported as PNG')
  }

  const downloadGraphData = () => {
    if (!data) return

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.download = `neo4j-graph-data-${new Date().toISOString()}.json`
    downloadLink.click()

    toast.success('Graph data downloaded as JSON')
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    applyFilters()
  }

  const highlightShortestPath = () => {
    if (!cyRef.current || !selectedNode) return

    const cy = cyRef.current
    const highlighted = cy.collection()
    const startNode = cy.getElementById(selectedNode.id)

    cy.elements().removeClass('highlighted dimmed')

    data.relationships.forEach((rel) => {
      const source = cy.getElementById(rel.startNode)
      const target = cy.getElementById(rel.endNode)

      if (source.nonempty() && target.nonempty()) {
        const path = cy.elements().aStar({
          root: source,
          goal: target,
        })

        if (path.found) {
          path.path.addClass('highlighted')
          highlighted.merge(path.path)
        }
      }
    })

    cy.elements().difference(highlighted).addClass('dimmed')
  }

  const resetGraphView = () => {
    setSearchQuery('')
    setFilterNodeType('all')
    setFilterEdgeType('all')
    setLineagePath([])
    cyRef.current?.elements().removeClass('highlighted dimmed')
  }

  const displayMetadata = () => {
    if (!data?.metadata) return null

    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        {data.metadata.executionTime !== undefined && (
          <div className="p-2 rounded border">
            <div className="text-muted-foreground text-xs uppercase">Execution Time</div>
            <div className="font-semibold">{data.metadata.executionTime} ms</div>
          </div>
        )}
        {data.metadata.recordCount !== undefined && (
          <div className="p-2 rounded border">
            <div className="text-muted-foreground text-xs uppercase">Records</div>
            <div className="font-semibold">{data.metadata.recordCount}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4" style={{ minHeight: height }}>
      <div className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Graph Controls</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowFilters((prev) => !prev)}>
              {showFilters ? <X size={18} /> : <FunnelSimple size={18} />}
            </Button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              <MagnifyingGlass size={16} />
            </Button>
          </form>

          {showFilters && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Node Type</label>
                <Select value={filterNodeType} onValueChange={setFilterNodeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.keys(NODE_TYPE_CONFIG).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Edge Type</label>
                <Select value={filterEdgeType} onValueChange={setFilterEdgeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All relationships" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Relationships</SelectItem>
                    {Object.keys(EDGE_TYPE_CONFIG).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={zoomIn} className="gap-2">
              <ArrowsIn size={16} />
              Zoom In
            </Button>
            <Button variant="outline" onClick={zoomOut} className="gap-2">
              <ArrowsOut size={16} />
              Zoom Out
            </Button>
            <Button variant="outline" onClick={centerGraph} className="gap-2">
              <Camera size={16} />
              Center
            </Button>
            <Button variant="outline" onClick={resetGraphView} className="gap-2">
              <X size={16} />
              Reset
            </Button>
            <Button variant="outline" onClick={highlightShortestPath} className="gap-2">
              <Path size={16} />
              Paths
            </Button>
            <Button variant="outline" onClick={screenshotGraph} className="gap-2">
              <DownloadSimple size={16} />
              Export PNG
            </Button>
            <Button variant="outline" onClick={downloadGraphData} className="gap-2 col-span-2">
              <DownloadSimple size={16} />
              Export JSON
            </Button>
            {onRefresh && (
              <Button variant="default" onClick={onRefresh} className="gap-2 col-span-2">
                Refresh Graph
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Layout</h4>
          <Tabs value={layout} onValueChange={(value) => setLayout(value)} className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="hierarchical">Hierarchical</TabsTrigger>
              <TabsTrigger value="force">Force-Directed</TabsTrigger>
              <TabsTrigger value="circular">Circular</TabsTrigger>
              <TabsTrigger value="concentric">Concentric</TabsTrigger>
              <TabsTrigger value="grid">Grid</TabsTrigger>
            </TabsList>
          </Tabs>
        </Card>

        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Graph Metadata</h4>
          {displayMetadata()}
        </Card>

        {selectedNode && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Selected Node</h4>
              <Badge variant="secondary">{selectedNode.labels[0]}</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">ID:</span> {selectedNode.id}
              </div>
              <div className="space-y-2 text-xs">
                {Object.entries(selectedNode.properties).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground uppercase font-medium">{key}</span>
                    <div className="font-mono bg-muted rounded p-1 mt-1">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className="relative overflow-hidden">
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <Badge variant="secondary">Nodes: {data?.nodes.length || 0}</Badge>
          <Badge variant="secondary">Edges: {data?.relationships.length || 0}</Badge>
        </div>

        <div ref={containerRef} className="h-full" style={{ minHeight: height }} />

        <div
          id="graph-tooltip"
          className="hidden pointer-events-none fixed z-50 rounded border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
        />
      </Card>
    </div>
  )
}
