import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataExportButton } from '@/components/DataExportButton'
import { apiService, GraphData, GraphNode } from '@/lib/api/service'
import { toast } from 'sonner'
import cytoscape, { Core, NodeSingular } from 'cytoscape'
import { 
  ArrowsIn, 
  ArrowsOut, 
  MagnifyingGlass, 
  FunnelSimple,
  DownloadSimple,
  Circle,
  Square,
  Hexagon,
  Gear,
  MapPin,
  Tag
} from '@phosphor-icons/react'

interface GraphViewProps {
  backendUrl: string
}

const nodeTypeColors: Record<string, string> = {
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

const nodeTypeShapes: Record<string, string> = {
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

export function GraphView({ backendUrl }: GraphViewProps) {
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterNodeType, setFilterNodeType] = useState<string>('all')
  const [layout, setLayout] = useState<'hierarchical' | 'force' | 'circular' | 'grid'>('hierarchical')
  const [showFilters, setShowFilters] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)

  apiService.setBaseUrl(backendUrl)

  useEffect(() => {
    if (graphData && containerRef.current) {
      initializeGraph()
    }
  }, [graphData])

  const initializeGraph = () => {
    if (!containerRef.current || !graphData) return

    const elements = [
      ...graphData.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.properties.name || node.id,
          type: node.labels[0] || 'Unknown',
          properties: node.properties,
        },
      })),
      ...graphData.relationships.map(rel => ({
        data: {
          id: rel.id,
          source: rel.startNode,
          target: rel.endNode,
          label: rel.type,
          type: rel.type,
        },
      })),
    ]

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => nodeTypeColors[ele.data('type')] || '#64748b',
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-weight': 600,
            'width': '60px',
            'height': '60px',
            'shape': (ele) => (nodeTypeShapes[ele.data('type')] || 'ellipse') as any,
            'border-width': '2px',
            'border-color': '#fff',
            'text-outline-color': (ele) => nodeTypeColors[ele.data('type')] || '#64748b',
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

    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target
      const nodeData = graphData.nodes.find(n => n.id === node.id())
      if (nodeData) {
        setSelectedNode(nodeData)
      }
    })

    cyRef.current.on('tap', (event) => {
      if (event.target === cyRef.current) {
        setSelectedNode(null)
        cyRef.current?.elements().removeClass('highlighted dimmed')
      }
    })
  }

  const getLayoutOptions = (layoutType: string) => {
    const layouts: Record<string, any> = {
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
    return layouts[layoutType] || layouts.hierarchical
  }

  const handleLoadGraph = async () => {
    setLoading(true)
    try {
      const data = await apiService.getGraph()
      setGraphData(data)
      toast.success(`Loaded ${data.nodes.length} nodes and ${data.relationships.length} relationships`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (term: string) => {
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

  const handleLayoutChange = (newLayout: string) => {
    setLayout(newLayout as any)
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

  const nodeTypes = graphData ? Array.from(new Set(graphData.nodes.map(n => n.labels[0]))) : []

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
          {graphData && (
            <DataExportButton 
              data={graphData.nodes}
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
                    backgroundColor: filterNodeType === type ? nodeTypeColors[type] : undefined,
                    borderColor: nodeTypeColors[type]
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
                  <Badge style={{ backgroundColor: nodeTypeColors[selectedNode.labels[0]] }}>
                    {selectedNode.labels[0]}
                  </Badge>
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedNode.properties.name || selectedNode.id}
                  </div>
                  {Object.entries(selectedNode.properties).map(([key, value]) => (
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
                {Object.entries(nodeTypeColors).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: color }}
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
                    <Badge variant="secondary">{graphData.nodes.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Relationships:</span>
                    <Badge variant="secondary">{graphData.relationships.length}</Badge>
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
