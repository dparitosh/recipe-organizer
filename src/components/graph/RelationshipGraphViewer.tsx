import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  X
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GraphNode {
  id: string
  labels: string[]
  properties: Record<string, any>
}

interface GraphRelationship {
  id: string
  type: string
  startNode: string
  endNode: string
  properties: Record<string, any>
}

interface GraphData {
  nodes: GraphNode[]
  relationships: GraphRelationship[]
  metadata?: {
    executionTime?: number
    recordCount?: number
  }
}

interface RelationshipGraphViewerProps {
  data: GraphData | null
  onNodeSelect?: (node: GraphNode | null) => void
  onRefresh?: () => void
  height?: string
}

type NodeType = 'Ingredient' | 'Recipe' | 'MasterRecipe' | 'ManufacturingRecipe' | 'Plant' | 'SalesOrder'
type EdgeType = 'uses' | 'derived_from' | 'produces' | 'CONTAINS' | 'REQUIRES'
type LayoutType = 'hierarchical' | 'force' | 'circular' | 'concentric' | 'grid'

const NODE_TYPE_CONFIG: Record<NodeType, { shape: string; color: string; icon: any; size: number }> = {
  Ingredient: { 
    shape: 'ellipse', 
    color: 'oklch(0.60 0.16 250)', 
    icon: Circle,
    size: 60
  },
  Recipe: { 
    shape: 'roundrectangle', 
    color: 'oklch(0.65 0.18 145)', 
    icon: Square,
    size: 80
  },
  MasterRecipe: { 
    shape: 'hexagon', 
    color: 'oklch(0.68 0.18 85)', 
    icon: Hexagon,
    size: 90
  },
  ManufacturingRecipe: { 
    shape: 'round-hexagon', 
    color: 'oklch(0.62 0.16 320)', 
    icon: Gear,
    size: 85
  },
  Plant: { 
    shape: 'round-diamond', 
    color: 'oklch(0.64 0.14 160)', 
    icon: MapPin,
    size: 70
  },
  SalesOrder: { 
    shape: 'round-tag', 
    color: 'oklch(0.70 0.18 50)', 
    icon: Tag,
    size: 65
  }
}

const EDGE_TYPE_CONFIG: Record<string, { color: string; style: string; width: number }> = {
  uses: { color: 'oklch(0.65 0.18 145)', style: 'solid', width: 2 },
  derived_from: { color: 'oklch(0.60 0.16 250)', style: 'dashed', width: 2 },
  produces: { color: 'oklch(0.70 0.18 50)', style: 'solid', width: 3 },
  CONTAINS: { color: 'oklch(0.65 0.18 145)', style: 'solid', width: 2 },
  REQUIRES: { color: 'oklch(0.55 0.14 300)', style: 'dotted', width: 2 }
}

export function RelationshipGraphViewer({
  data,
  onNodeSelect,
  onRefresh,
  height = '70vh'
}: RelationshipGraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterNodeType, setFilterNodeType] = useState<string>('all')
  const [filterEdgeType, setFilterEdgeType] = useState<string>('all')
  const [layout, setLayout] = useState<LayoutType>('hierarchical')
  const [showFilters, setShowFilters] = useState(false)
  const [lineagePath, setLineagePath] = useState<string[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    const styles: any[] = [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '11px',
          'font-weight': '600',
          'color': '#fff',
          'text-outline-color': '#000',
          'text-outline-width': 2,
          'text-wrap': 'wrap',
          'text-max-width': '90px',
          'min-zoomed-font-size': 8
        }
      },
      ...Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => ({
        selector: `node[nodeType="${type}"]`,
        style: {
          'background-color': config.color,
          'shape': config.shape,
          'width': config.size,
          'height': config.size,
          'border-width': 3,
          'border-color': config.color.replace('0.6', '0.4')
        }
      })),
      {
        selector: 'node:selected',
        style: {
          'border-width': 5,
          'border-color': 'oklch(0.70 0.18 50)',
          'background-color': 'data(selectedColor)',
          'z-index': 9999
        }
      },
      {
        selector: 'node.highlighted',
        style: {
          'border-width': 5,
          'border-color': 'oklch(0.75 0.20 50)',
          'background-color': 'data(highlightColor)',
          'z-index': 9998
        }
      },
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.3
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': 'oklch(0.50 0.02 250)',
          'target-arrow-color': 'oklch(0.50 0.02 250)',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 1.2,
          'opacity': 0.8
        }
      },
      ...Object.entries(EDGE_TYPE_CONFIG).map(([type, config]) => ({
        selector: `edge[edgeType="${type}"]`,
        style: {
          'line-color': config.color,
          'target-arrow-color': config.color,
          'line-style': config.style,
          'width': config.width
        }
      })),
      {
        selector: 'edge:selected',
        style: {
          'line-color': 'oklch(0.70 0.18 50)',
          'target-arrow-color': 'oklch(0.70 0.18 50)',
          'width': 4,
          'z-index': 9999
        }
      },
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': 'oklch(0.75 0.20 50)',
          'target-arrow-color': 'oklch(0.75 0.20 50)',
          'width': 4,
          'z-index': 9998,
          'opacity': 1
        }
      },
      {
        selector: 'edge.dimmed',
        style: {
          'opacity': 0.15
        }
      }
    ]

    cyRef.current = cytoscape({
      container: containerRef.current,
      style: styles,
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.15,
      boxSelectionEnabled: true,
      selectionType: 'single'
    })

    const cy = cyRef.current

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const nodeData: GraphNode = {
        id: node.id(),
        labels: [node.data('nodeType')],
        properties: node.data()
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
        tooltip.style.left = evt.originalEvent.clientX + 10 + 'px'
        tooltip.style.top = evt.originalEvent.clientY + 10 + 'px'
      }
    })

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!cyRef.current || !data) return

    const cy = cyRef.current
    cy.elements().remove()

    data.nodes.forEach(node => {
      const nodeType = node.labels[0] as NodeType
      const config = NODE_TYPE_CONFIG[nodeType]
      
      cy.add({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.properties.name || node.properties.id || node.id,
          nodeType: nodeType,
          selectedColor: config?.color || 'oklch(0.65 0.18 145)',
          highlightColor: config?.color?.replace(/0\.\d+/, '0.75') || 'oklch(0.75 0.18 145)',
          ...node.properties
        }
      })
    })

    data.relationships.forEach(rel => {
      cy.add({
        group: 'edges',
        data: {
          id: rel.id,
          source: rel.startNode,
          target: rel.endNode,
          edgeType: rel.type,
          label: rel.properties.label || '',
          ...rel.properties
        }
      })
    })

    applyLayoutInternal(layout)
    applyFilters()
  }, [data])

  useEffect(() => {
    if (!cyRef.current) return
    applyFilters()
  }, [filterNodeType, filterEdgeType, searchQuery])

  useEffect(() => {
    if (!cyRef.current) return
    applyLayoutInternal(layout)
  }, [layout])

  const applyLayoutInternal = (layoutType: LayoutType) => {
    if (!cyRef.current) return

    const layouts: Record<LayoutType, any> = {
      hierarchical: {
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.8,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true
      },
      force: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 10000,
        idealEdgeLength: 120,
        edgeElasticity: 100,
        gravity: 1,
        numIter: 1000
      },
      circular: {
        name: 'circle',
        avoidOverlap: true,
        spacingFactor: 1.5
      },
      concentric: {
        name: 'concentric',
        concentric: (node: any) => {
          const type = node.data('nodeType')
          if (type === 'MasterRecipe') return 3
          if (type === 'Recipe') return 2
          return 1
        },
        levelWidth: () => 2,
        avoidOverlap: true,
        spacingFactor: 2
      },
      grid: {
        name: 'grid',
        avoidOverlap: true,
        avoidOverlapPadding: 30
      }
    }

    cyRef.current.layout(layouts[layoutType]).run()
  }

  const applyFilters = () => {
    if (!cyRef.current) return

    const cy = cyRef.current
    
    cy.nodes().removeClass('dimmed')
    cy.edges().removeClass('dimmed')

    if (filterNodeType !== 'all') {
      cy.nodes().forEach(node => {
        if (node.data('nodeType') !== filterNodeType) {
          node.addClass('dimmed')
        }
      })
    }

    if (filterEdgeType !== 'all') {
      cy.edges().forEach(edge => {
        if (edge.data('edgeType') !== filterEdgeType) {
          edge.addClass('dimmed')
        }
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      cy.nodes().forEach(node => {
        const label = (node.data('label') || '').toLowerCase()
        const id = (node.data('id') || '').toLowerCase()
        if (!label.includes(query) && !id.includes(query)) {
          node.addClass('dimmed')
        } else {
          node.removeClass('dimmed')
        }
      })
    }
  }

  const highlightLineage = (nodeId: string) => {
    if (!cyRef.current) return

    const cy = cyRef.current
    const node = cy.getElementById(nodeId)

    clearHighlights()

    const predecessors = node.predecessors()
    const successors = node.successors()
    
    predecessors.addClass('highlighted')
    successors.addClass('highlighted')
    node.addClass('highlighted')

    const pathNodes = predecessors.nodes().map(n => n.id()).concat([nodeId])
    setLineagePath(pathNodes)

    cy.nodes().difference(predecessors.union(successors).union(node)).addClass('dimmed')
    cy.edges().difference(predecessors.union(successors)).addClass('dimmed')
  }

  const clearHighlights = () => {
    if (!cyRef.current) return

    const cy = cyRef.current
    cy.elements().removeClass('highlighted dimmed')
    setLineagePath([])
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleZoomIn = () => {
    if (!cyRef.current) return
    const currentZoom = cyRef.current.zoom()
    cyRef.current.animate({
      zoom: currentZoom * 1.2,
      duration: 300
    })
  }

  const handleZoomOut = () => {
    if (!cyRef.current) return
    const currentZoom = cyRef.current.zoom()
    cyRef.current.animate({
      zoom: currentZoom * 0.8,
      duration: 300
    })
  }

  const handleFitView = () => {
    if (!cyRef.current) return
    cyRef.current.fit(undefined, 50)
  }

  const handleExportImage = () => {
    if (!cyRef.current) return
    const png = cyRef.current.png({
      output: 'base64',
      bg: 'oklch(0.25 0.01 250)',
      full: true,
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'graph-export.png'
    link.href = png
    link.click()
    toast.success('Graph exported as image')
  }

  const handleExportJSON = () => {
    if (!cyRef.current || !data) return
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'graph-data.json'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Graph data exported as JSON')
  }

  const uniqueNodeTypes = data ? Array.from(new Set(data.nodes.map(n => n.labels[0]))) : []
  const uniqueEdgeTypes = data ? Array.from(new Set(data.relationships.map(r => r.type))) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-card/50 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search nodes..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => handleSearch('')}
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant={showFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <FunnelSimple size={16} />
                Filters
              </Button>

              <Select value={layout} onValueChange={(v) => setLayout(v as LayoutType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="force">Force-Directed</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="concentric">Concentric</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1 border rounded-md">
                <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-8 w-8 p-0">
                  <ArrowsIn size={16} />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-8 w-8 p-0">
                  <ArrowsOut size={16} />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleFitView} className="h-8 w-8 p-0">
                  <Camera size={16} />
                </Button>
              </div>

              <Button size="sm" variant="outline" onClick={handleExportImage} className="gap-2">
                <DownloadSimple size={16} />
                PNG
              </Button>
            </div>

            {showFilters && (
              <div className="flex gap-2 flex-wrap animate-in slide-in-from-top-2 duration-200">
                <Select value={filterNodeType} onValueChange={setFilterNodeType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by node type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Node Types</SelectItem>
                    {uniqueNodeTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterEdgeType} onValueChange={setFilterEdgeType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by edge type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Edge Types</SelectItem>
                    {uniqueEdgeTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filterNodeType !== 'all' || filterEdgeType !== 'all' || searchQuery) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFilterNodeType('all')
                      setFilterEdgeType('all')
                      setSearchQuery('')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <div 
              ref={containerRef} 
              style={{ height }}
              className="w-full bg-background"
            />
            <div
              id="graph-tooltip"
              className="fixed hidden bg-popover text-popover-foreground border border-border rounded-md p-2 shadow-lg z-50 pointer-events-none"
              style={{ display: 'none' }}
            />
            {!data && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No graph data to display</p>
                  {onRefresh && (
                    <Button onClick={onRefresh} variant="outline">
                      Load Graph Data
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {data && (
            <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
              <div className="flex gap-4">
                <span>{data.nodes.length} nodes</span>
                <span>{data.relationships.length} edges</span>
                {data.metadata?.executionTime && (
                  <span>{data.metadata.executionTime}ms</span>
                )}
              </div>
              {lineagePath.length > 0 && (
                <div className="flex items-center gap-2">
                  <Path size={14} />
                  <span>Lineage: {lineagePath.length} nodes</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="h-full">
          <Tabs defaultValue="node" className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="node">Node Info</TabsTrigger>
                <TabsTrigger value="legend">Legend</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="node" className="flex-1 m-0">
              <ScrollArea className="h-[calc(70vh-60px)]">
                {selectedNode ? (
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const nodeType = selectedNode.labels[0] as NodeType
                          const Icon = NODE_TYPE_CONFIG[nodeType]?.icon || Circle
                          return <Icon size={24} weight="duotone" className="text-primary" />
                        })()}
                        <h3 className="font-semibold text-lg">
                          {selectedNode.properties.name || selectedNode.id}
                        </h3>
                      </div>
                      <Badge variant="secondary">{selectedNode.labels[0]}</Badge>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">Properties</h4>
                      {Object.entries(selectedNode.properties)
                        .filter(([key]) => !['label', 'nodeType', 'selectedColor', 'highlightColor'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                            <span className="text-muted-foreground font-medium capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="col-span-2 break-words">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>

                    {lineagePath.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            <Path size={16} />
                            Lineage Path
                          </h4>
                          <div className="space-y-1">
                            {lineagePath.map((nodeId, idx) => (
                              <div key={nodeId} className="text-xs flex items-center gap-2">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <span className={cn(
                                  nodeId === selectedNode.id && "font-semibold text-primary"
                                )}>
                                  {nodeId}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedNode(null)
                          onNodeSelect?.(null)
                          clearHighlights()
                        }}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Circle size={48} className="mx-auto mb-3 opacity-50" weight="duotone" />
                    <p>Select a node to view details</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="legend" className="flex-1 m-0">
              <ScrollArea className="h-[calc(70vh-60px)]">
                <div className="p-4 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Node Types</h4>
                    <div className="space-y-2">
                      {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => {
                        const Icon = config.icon
                        return (
                          <div key={type} className="flex items-center gap-3 text-sm">
                            <Icon 
                              size={20} 
                              weight="fill" 
                              style={{ color: config.color }}
                            />
                            <span>{type}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-semibold mb-3">Edge Types</h4>
                    <div className="space-y-2">
                      {Object.entries(EDGE_TYPE_CONFIG).map(([type, config]) => (
                        <div key={type} className="flex items-center gap-3 text-sm">
                          <div 
                            className="w-8 h-0.5"
                            style={{ 
                              backgroundColor: config.color,
                              borderStyle: config.style === 'dashed' ? 'dashed' : config.style === 'dotted' ? 'dotted' : 'solid',
                              borderWidth: config.style !== 'solid' ? '1px' : '0',
                              borderColor: config.color,
                              height: config.style !== 'solid' ? '0' : undefined
                            }}
                          />
                          <span>{type.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Interactions</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Click node to select and view details</li>
                      <li>• Click background to deselect</li>
                      <li>• Mouse wheel to zoom</li>
                      <li>• Drag to pan</li>
                      <li>• Hover for quick info</li>
                      <li>• Selection highlights lineage</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
