import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MagnifyingGlassMinus, 
  MagnifyingGlassPlus, 
  ArrowsIn, 
  CircleNotch,
  ShareNetwork,
  ListBullets
} from '@phosphor-icons/react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// Graph visualization configuration
const NODE_TYPE_COLORS = {
  Formulation: '#1d4ed8',
  Ingredient: '#0ea5e9',
  Food: '#06b6d4',
  Nutrient: '#10b981',
  ProcessStep: '#4338ca',
  Equipment: '#ea580c',
  BOMItem: '#fb923c',
  RecipeVersion: '#6366f1',
  Default: '#64748b',
}

const GRAPH_STYLE_CONFIG = {
  node: {
    color: '#fff',
    textOutlineColor: '#000',
    textOutlineWidth: 2,
    fontSize: 12,
    width: 60,
    height: 60,
  },
  nodeSelected: {
    borderWidth: 3,
    borderColor: '#f59e0b',
    backgroundColor: '#fbbf24',
  },
  edge: {
    width: 2,
    lineColor: '#94a3b8',
    arrowColor: '#94a3b8',
    fontSize: 10,
    labelColor: '#475569',
    textBackgroundColor: '#fff',
    textBackgroundOpacity: 0.8,
    textBackgroundPadding: 2,
  },
}

const LAYOUT_CONFIG = {
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
}

const ZOOM_CONFIG = {
  min: 0.1,
  max: 3,
  inFactor: 1.2,
  outFactor: 0.8,
  fitPadding: 50,
}

const UI_CONFIG = {
  graphHeight: 600,
  legendHeight: 200,
  propertiesHeight: 150,
  emptyIconSize: 32,
  loadingIconSize: 32,
}

export function GraphSnapshotViewer({ graphSnapshot }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [stats, setStats] = useState({ nodes: 0, edges: 0, nodeTypes: {} })

  useEffect(() => {
    if (!graphSnapshot || !containerRef.current) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Parse graph data
      const nodes = graphSnapshot.nodes || []
      const edges = graphSnapshot.edges || []

      // Validate we have nodes to render
      if (nodes.length === 0) {
        setLoading(false)
        return
      }

      // Calculate statistics
      const nodeTypes = {}
      nodes.forEach((node) => {
        const type = node.label || node.type || 'Unknown'
        nodeTypes[type] = (nodeTypes[type] || 0) + 1
      })
      setStats({ nodes: nodes.length, edges: edges.length, nodeTypes })

      // Convert to Cytoscape format
      const elements = [
        ...nodes.map((node) => ({
          data: {
            id: String(node.id),
            label: node.properties?.name || node.properties?.description || String(node.id),
            type: node.label || node.type || 'Unknown',
            properties: node.properties || {},
            color: NODE_TYPE_COLORS[node.label || node.type] || NODE_TYPE_COLORS.Default,
          },
        })),
        ...edges.map((edge, index) => ({
          data: {
            id: edge.id ? String(edge.id) : `edge-${index}-${edge.source || edge.from}-${edge.target || edge.to}`,
            source: String(edge.source || edge.from),
            target: String(edge.target || edge.to),
            label: edge.relationship || edge.type || '',
            properties: edge.properties || {},
          },
        })),
      ]

      // Initialize Cytoscape
      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)',
              label: 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              color: GRAPH_STYLE_CONFIG.node.color,
              'text-outline-color': GRAPH_STYLE_CONFIG.node.textOutlineColor,
              'text-outline-width': GRAPH_STYLE_CONFIG.node.textOutlineWidth,
              'font-size': GRAPH_STYLE_CONFIG.node.fontSize,
              'font-weight': 'bold',
              width: GRAPH_STYLE_CONFIG.node.width,
              height: GRAPH_STYLE_CONFIG.node.height,
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': GRAPH_STYLE_CONFIG.nodeSelected.borderWidth,
              'border-color': GRAPH_STYLE_CONFIG.nodeSelected.borderColor,
              'background-color': GRAPH_STYLE_CONFIG.nodeSelected.backgroundColor,
            },
          },
          {
            selector: 'edge',
            style: {
              width: GRAPH_STYLE_CONFIG.edge.width,
              'line-color': GRAPH_STYLE_CONFIG.edge.lineColor,
              'target-arrow-color': GRAPH_STYLE_CONFIG.edge.arrowColor,
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              label: 'data(label)',
              'font-size': GRAPH_STYLE_CONFIG.edge.fontSize,
              color: GRAPH_STYLE_CONFIG.edge.labelColor,
              'text-rotation': 'autorotate',
              'text-background-color': GRAPH_STYLE_CONFIG.edge.textBackgroundColor,
              'text-background-opacity': GRAPH_STYLE_CONFIG.edge.textBackgroundOpacity,
              'text-background-padding': GRAPH_STYLE_CONFIG.edge.textBackgroundPadding,
            },
          },
        ],
        layout: LAYOUT_CONFIG,
        minZoom: ZOOM_CONFIG.min,
        maxZoom: ZOOM_CONFIG.max,
      })

      cyRef.current = cy

      // Node selection handler
      cy.on('tap', 'node', (event) => {
        const node = event.target
        setSelectedNode({
          id: node.id(),
          label: node.data('label'),
          type: node.data('type'),
          properties: node.data('properties'),
        })
      })

      // Click background to deselect
      cy.on('tap', (event) => {
        if (event.target === cy) {
          setSelectedNode(null)
        }
      })

      setLoading(false)
    } catch (err) {
      console.error('Failed to render graph:', err)
      setError(err.message)
      setLoading(false)
    }

    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [graphSnapshot])

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * ZOOM_CONFIG.inFactor)
      cyRef.current.center()
    }
  }

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * ZOOM_CONFIG.outFactor)
      cyRef.current.center()
    }
  }

  const handleFitView = () => {
    if (cyRef.current) {
      cyRef.current.fit(null, ZOOM_CONFIG.fitPadding)
    }
  }

  if (!graphSnapshot || (graphSnapshot.nodes && graphSnapshot.nodes.length === 0)) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <ShareNetwork size={UI_CONFIG.emptyIconSize} className="opacity-50" />
            <p className="text-sm">No graph data available</p>
            <p className="text-xs">Graph snapshot not saved during orchestration</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <CircleNotch size={UI_CONFIG.loadingIconSize} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Rendering graph...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-3 text-destructive">
            <p className="text-sm font-medium">Failed to render graph</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Graph Visualization</CardTitle>
                <CardDescription>
                  {stats.nodes} nodes, {stats.edges} relationships
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <MagnifyingGlassPlus size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <MagnifyingGlassMinus size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleFitView}>
                  <ArrowsIn size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={containerRef}
              className={`w-full border border-border rounded-md bg-slate-50 dark:bg-slate-950`}
              style={{ height: `${UI_CONFIG.graphHeight}px` }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Node Type Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ListBullets size={16} />
              Node Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className={`h-[${UI_CONFIG.legendHeight}px]`}>
              <div className="space-y-2">
                {Object.entries(stats.nodeTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.Default,
                        }}
                      />
                      <span>{type}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Selected Node Details */}
        {selectedNode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selected Node</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <Badge>{selectedNode.type}</Badge>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Label</p>
                  <p className="text-sm font-medium">{selectedNode.label}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID</p>
                  <p className="text-xs font-mono break-all">{selectedNode.id}</p>
                </div>

                {Object.keys(selectedNode.properties).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Properties</p>
                      <ScrollArea className={`h-[${UI_CONFIG.propertiesHeight}px]`}>
                        <div className="space-y-2">
                          {Object.entries(selectedNode.properties).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="font-medium text-muted-foreground">{key}:</span>{' '}
                              <span className="break-all">
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
