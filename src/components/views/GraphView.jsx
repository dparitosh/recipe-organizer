import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataExportButton } from '@/components/DataExportButton'
import { apiService } from '@/lib/api/service'
import { toast } from 'sonner'
import cytoscape from 'cytoscape'
import { 
  ArrowsIn, 
  ArrowsOut, 
  MagnifyingGlass, 
  FunnelSimple,
  DownloadSimple,
  FileArrowDown,
  ImageSquare,
  Circle,
} from '@phosphor-icons/react'

const FALLBACK_NODE_COLORS = {
  Formulation: '#3b82f6',
  Ingredient: '#8b5cf6',
  Food: '#8b5cf6',
  Nutrient: '#f59e0b',
  Process: '#6366f1',
  Recipe: '#3b82f6',
  MasterRecipe: '#0ea5e9',
  ManufacturingRecipe: '#7c3aed',
  Plant: '#14b8a6',
  SalesOrder: '#f59e0b',
}

const FALLBACK_NODE_SHAPES = {
  Formulation: 'ellipse',
  Ingredient: 'ellipse',
  Food: 'ellipse',
  Nutrient: 'ellipse',
  Process: 'rectangle',
  Recipe: 'round-rectangle',
  MasterRecipe: 'hexagon',
  ManufacturingRecipe: 'hexagon',
  Plant: 'diamond',
  SalesOrder: 'tag',
}

const DEFAULT_NODE_COLOR = '#64748b'
const DEFAULT_NODE_SHAPE = 'ellipse'

const layoutPresets = {
  hierarchical: {
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5,
    animate: true,
    animationDuration: 500,
  },
  force: {
    name: 'cose',
    animate: true,
    animationDuration: 500,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
  },
  circular: {
    name: 'circle',
    animate: true,
    animationDuration: 500,
  },
  grid: {
    name: 'grid',
    animate: true,
    animationDuration: 500,
  },
}

const getLayoutOptions = (layoutType) => layoutPresets[layoutType] || layoutPresets.hierarchical

export function GraphView({ backendUrl }) {
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [filterNodeType, setFilterNodeType] = useState('all')
  const [layout, setLayout] = useState('hierarchical')
  const [showFilters, setShowFilters] = useState(false)
  const [schema, setSchema] = useState(null)
  const [installingSchema, setInstallingSchema] = useState(false)
  
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  apiService.setBaseUrl(backendUrl)

  useEffect(() => {
    let cancelled = false

    const fetchSchema = async () => {
      try {
        const payload = await apiService.getGraphSchema()
        if (!cancelled) {
          setSchema(payload)
        }
      } catch (error) {
        console.warn('Failed to load graph schema metadata', error)
      }
    }

    fetchSchema()

    return () => {
      cancelled = true
    }
  }, [backendUrl])

  const nodeStyleMap = useMemo(() => {
    const defaults = {
      color: schema?.defaults?.node?.color || DEFAULT_NODE_COLOR,
      shape: schema?.defaults?.node?.shape || DEFAULT_NODE_SHAPE,
    }

    const colors = { ...FALLBACK_NODE_COLORS }
    const shapes = { ...FALLBACK_NODE_SHAPES }

    if (schema?.node_types) {
      schema.node_types.forEach((typeConfig) => {
        if (!typeConfig?.type) {
          return
        }

        if (typeConfig.color) {
          colors[typeConfig.type] = typeConfig.color
        }

        if (typeConfig.shape) {
          shapes[typeConfig.type] = typeConfig.shape
        }
      })
    }

    return { colors, shapes, defaults }
  }, [schema])

  const getNodeColor = useCallback(
    (type) => nodeStyleMap.colors[type] || nodeStyleMap.defaults.color,
    [nodeStyleMap]
  )

  const getNodeShape = useCallback(
    (type) => nodeStyleMap.shapes[type] || nodeStyleMap.defaults.shape,
    [nodeStyleMap]
  )

  const normalizedNodes = useMemo(() => {
    if (!graphData?.nodes) {
      return []
    }
    return graphData.nodes.map((node) => ({
      id: node.id,
      label: node.properties?.name || node.id,
      type: node.labels?.[0] || 'Unknown',
      properties: node.properties ?? {},
    }))
  }, [graphData])

  const normalizedEdges = useMemo(() => {
    const rawEdges = graphData?.edges ?? graphData?.relationships ?? []
    return rawEdges.map((edge, index) => {
      const source = edge.source ?? edge.startNode ?? edge.from
      const target = edge.target ?? edge.endNode ?? edge.to
      return {
        id: edge.id ?? `${source || 'src'}-${target || 'tgt'}-${edge.type || index}`,
        source,
        target,
        label: edge.label ?? edge.type ?? 'RELATES_TO',
        type: edge.type ?? edge.label ?? 'RELATES_TO',
        properties: edge.properties ?? {},
      }
    })
  }, [graphData])

  useEffect(() => {
    if (!graphData || !containerRef.current) {
      return
    }

    const elements = [
      ...normalizedNodes.map((node) => ({
        data: node,
      })),
      ...normalizedEdges
        .filter((edge) => edge.source && edge.target)
        .map((edge) => ({
          data: edge,
        })),
    ]

    const cyInstance = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => getNodeColor(ele.data('type')),
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-weight': 600,
            'width': '60px',
            'height': '60px',
            'shape': (ele) => getNodeShape(ele.data('type')),
            'border-width': '2px',
            'border-color': '#fff',
            'text-outline-color': (ele) => getNodeColor(ele.data('type')),
            'text-outline-width': '2px',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#cbd5e1',
            'target-arrow-color': '#cbd5e1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-background-color': '#fff',
            'text-background-opacity': 1,
            'text-background-padding': '3px',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': '4px',
            'border-color': '#3b82f6',
            'z-index': 999,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'opacity': 1,
          },
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.3,
          },
        },
      ],
      layout: getLayoutOptions(layout),
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.2,
    })

    cyInstance.on('tap', 'node', (event) => {
      const node = event.target
      const nodeData = normalizedNodes.find((n) => n.id === node.id())
      if (nodeData) {
        setSelectedNode(nodeData)
      }
    })

    cyInstance.on('tap', (event) => {
      if (event.target === cyInstance) {
        setSelectedNode(null)
        cyInstance?.elements().removeClass('highlighted dimmed')
      }
    })

    cyRef.current = cyInstance

    return () => {
      cyInstance.destroy()
      cyRef.current = null
    }
  }, [graphData, layout, normalizedNodes, normalizedEdges, getNodeColor, getNodeShape])

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.layout(getLayoutOptions(layout)).run()
    }
  }, [layout])

  const handleLoadGraph = async () => {
    setLoading(true)
    try {
      const data = await apiService.getGraph()
      setGraphData(data)
      const nodeCount = data?.node_count ?? data?.nodes?.length ?? 0
      const edgeCount = data?.edge_count ?? data?.edges?.length ?? data?.relationships?.length ?? 0
      toast.success(`Loaded ${nodeCount} nodes and ${edgeCount} relationships`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    if (!cyRef.current) return

    if (!term) {
      cyRef.current.elements().removeClass('highlighted dimmed')
      return
    }

    const matching = cyRef.current.nodes().filter(node => {
      const label = node.data('label').toLowerCase()
      return label.includes(term.toLowerCase())
    })

    cyRef.current.elements().addClass('dimmed')
    matching.removeClass('dimmed').addClass('highlighted')
  }

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2)
      cyRef.current.center()
    }
  }

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8)
      cyRef.current.center()
    }
  }

  const handleFit = () => {
    cyRef.current?.fit(undefined, 50)
  }

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout)
    if (cyRef.current) {
      const layoutOptions = getLayoutOptions(newLayout)
      cyRef.current.layout(layoutOptions).run()
    }
  }

  const handleExportPNG = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ scale: 2, full: true })
      const link = document.createElement('a')
      link.href = png
      link.download = 'graph-export.png'
      link.click()
      toast.success('Graph exported as PNG')
    }
  }

  const handleDownloadGraphML = async () => {
    try {
      const graphml = await apiService.exportGraphSchemaGraphML()
      const blob = new Blob([graphml], { type: 'application/graphml+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'graph-schema.graphml'
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Schema exported as GraphML')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export GraphML')
    }
  }

  const handleDownloadSchemaSVG = async () => {
    try {
      const svgContent = await apiService.exportGraphSchemaSVG()
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'graph-schema.svg'
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Schema legend exported as SVG')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export SVG')
    }
  }

  const handleInstallDefaultSchema = async () => {
    setInstallingSchema(true)
    try {
      const payload = await apiService.installDefaultGraphSchema()
      setSchema(payload)
      toast.success('Default schema installed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to install default schema')
    } finally {
      setInstallingSchema(false)
    }
  }

  const observedTypes = useMemo(() => {
    if (!normalizedNodes.length) {
      return []
    }
    return Array.from(new Set(normalizedNodes.map((node) => node.type))).filter(Boolean)
  }, [normalizedNodes])

  const schemaTypes = useMemo(() => {
    if (!schema?.node_types?.length) {
      return []
    }
    return schema.node_types.map((typeConfig) => typeConfig.type).filter(Boolean)
  }, [schema])

  const nodeTypes = useMemo(() => {
    if (observedTypes.length) {
      return observedTypes
    }
    if (schemaTypes.length) {
      return schemaTypes
    }
    return Object.keys(nodeStyleMap.colors)
  }, [observedTypes, schemaTypes, nodeStyleMap.colors])

  const legendTypes = useMemo(() => {
    if (observedTypes.length) {
      return observedTypes
    }
    if (schemaTypes.length) {
      return schemaTypes
    }
    return Object.keys(nodeStyleMap.colors)
  }, [observedTypes, schemaTypes, nodeStyleMap.colors])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Graph Explorer</h2>
          <p className="text-muted-foreground mt-1">
            Interactive visualization of formulation relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInstallDefaultSchema} disabled={loading || installingSchema}>
            {installingSchema ? 'Installing...' : 'Install Default Schema'}
          </Button>
          <Button variant="outline" onClick={handleDownloadGraphML} disabled={loading}>
            <FileArrowDown size={18} className="mr-2" />
            GraphML
          </Button>
          <Button variant="outline" onClick={handleDownloadSchemaSVG} disabled={loading}>
            <ImageSquare size={18} className="mr-2" />
            Schema SVG
          </Button>
          {graphData && (
            <DataExportButton
              data={normalizedNodes}
              filename="graph-nodes"
              disabled={loading}
            />
          )}
          <Button onClick={handleLoadGraph} disabled={loading}>
            {loading ? 'Loading...' : 'Load Graph Data'}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FunnelSimple size={20} />
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={layout} onValueChange={handleLayoutChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hierarchical">Hierarchical</SelectItem>
                <SelectItem value="force">Force-Directed</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ArrowsIn size={20} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ArrowsOut size={20} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleFit}>
              <Circle size={20} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExportPNG}>
              <DownloadSimple size={20} />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-3">Filters</h4>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={filterNodeType === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterNodeType('all')}
              >
                All Types
              </Badge>
              {nodeTypes.map(type => (
                <Badge 
                  key={type}
                  variant={filterNodeType === type ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterNodeType(type)}
                  style={{ 
                    backgroundColor: filterNodeType === type ? getNodeColor(type) : undefined,
                    borderColor: getNodeColor(type)
                  }}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div 
              ref={containerRef}
              className="w-full h-[600px] rounded-lg border border-border bg-background"
            />
          </div>

          <div className="space-y-4">
            {selectedNode ? (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge style={{ backgroundColor: getNodeColor(selectedNode.type) }}>
                    {selectedNode.type}
                  </Badge>
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>{' '}
                    {selectedNode.properties?.name || selectedNode.label || selectedNode.id}
                  </div>
                  {Object.entries(selectedNode.properties ?? {}).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-4 text-center text-muted-foreground">
                Click a node to view details
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Legend</h3>
              <div className="space-y-2">
                {legendTypes.map((type) => (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: getNodeColor(type) }}
                    />
                    <span>{type}</span>
                  </div>
                ))}
              </div>
            </Card>

            {graphData && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Nodes:</span>
                    <Badge variant="secondary">{normalizedNodes.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Relationships:</span>
                    <Badge variant="secondary">{normalizedEdges.length}</Badge>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
