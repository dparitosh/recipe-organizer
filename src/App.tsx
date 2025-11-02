import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Node, Edge, GraphData, ViewTransform } from '@/lib/types'
import { GraphCanvas } from '@/components/GraphCanvas'
import { NodeEditor } from '@/components/NodeEditor'
import { EmptyState } from '@/components/EmptyState'
import { Toolbar } from '@/components/Toolbar'
import { Toaster } from '@/components/ui/sonner'
import { Graph } from '@phosphor-icons/react'
import { toast } from 'sonner'

const NODE_COLORS = [
  'oklch(0.68 0.18 25)',
  'oklch(0.62 0.24 295)', 
  'oklch(0.75 0.20 130)',
  'oklch(0.70 0.18 50)',
  'oklch(0.65 0.20 260)',
  'oklch(0.72 0.18 340)',
]

function App() {
  const [graphData, setGraphData] = useKV<GraphData>('graph-data', { nodes: [], edges: [] })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isCreatingEdge, setIsCreatingEdge] = useState(false)
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    x: 400,
    y: 300,
    scale: 1,
  })

  const nodes = graphData?.nodes || []
  const edges = graphData?.edges || []
  const selectedNode = nodes.find(n => n.id === selectedNodeId)

  const addNode = (x?: number, y?: number) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      x: x ?? 400,
      y: y ?? 300,
      label: `Node ${nodes.length + 1}`,
      color: NODE_COLORS[nodes.length % NODE_COLORS.length],
    }

    setGraphData((current) => ({
      nodes: [...(current?.nodes || []), newNode],
      edges: current?.edges || [],
    }))

    setSelectedNodeId(newNode.id)
    toast.success('Node added')
  }

  const updateNode = (nodeId: string, updates: Partial<Node>) => {
    setGraphData((current) => ({
      nodes: (current?.nodes || []).map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
      edges: current?.edges || [],
    }))
  }

  const deleteNode = (nodeId: string) => {
    setGraphData((current) => ({
      nodes: (current?.nodes || []).filter((node) => node.id !== nodeId),
      edges: (current?.edges || []).filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    }))
    setSelectedNodeId(null)
    toast.success('Node deleted')
  }

  const moveNode = (nodeId: string, x: number, y: number) => {
    updateNode(nodeId, { x, y })
  }

  const createEdge = (sourceId: string, targetId: string) => {
    const edgeExists = edges.some(
      (edge) => edge.source === sourceId && edge.target === targetId
    )

    if (edgeExists) {
      toast.error('Edge already exists')
      return
    }

    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: sourceId,
      target: targetId,
    }

    setGraphData((current) => ({
      nodes: current?.nodes || [],
      edges: [...(current?.edges || []), newEdge],
    }))

    toast.success('Edge created')
  }

  const clearGraph = () => {
    setGraphData({ nodes: [], edges: [] })
    setSelectedNodeId(null)
    toast.success('Graph cleared')
  }

  const fitView = () => {
    if (nodes.length === 0) {
      setViewTransform({ x: 400, y: 300, scale: 1 })
      return
    }

    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const width = maxX - minX + 200
    const height = maxY - minY + 200
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const scaleX = window.innerWidth / width
    const scaleY = (window.innerHeight - 100) / height
    const scale = Math.min(scaleX, scaleY, 1.5)

    setViewTransform({
      x: window.innerWidth / 2 - centerX * scale,
      y: (window.innerHeight - 50) / 2 - centerY * scale,
      scale,
    })

    toast.success('View fitted')
  }

  const zoomIn = () => {
    setViewTransform((current) => ({
      ...current,
      scale: Math.min(5, current.scale * 1.2),
    }))
  }

  const zoomOut = () => {
    setViewTransform((current) => ({
      ...current,
      scale: Math.max(0.1, current.scale / 1.2),
    }))
  }

  const exportGraph = () => {
    const dataStr = JSON.stringify(graphData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `graph-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    toast.success('Graph exported')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNodeId) {
        deleteNode(selectedNodeId)
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId])

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toaster position="top-center" />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Graph className="text-primary" size={28} weight="duotone" />
          <h1 className="text-2xl font-bold">Graph Visualizer</h1>
        </div>
      </header>

      <Toolbar
        onAddNode={() => addNode()}
        onClearGraph={clearGraph}
        onFitView={fitView}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onExport={exportGraph}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNodeMove={moveNode}
            onNodeDoubleClick={addNode}
            onEdgeCreate={createEdge}
            isCreatingEdge={isCreatingEdge}
            setIsCreatingEdge={setIsCreatingEdge}
            viewTransform={viewTransform}
            onViewTransformChange={setViewTransform}
          />
          {nodes.length === 0 && <EmptyState onAddNode={() => addNode()} />}
        </div>

        {selectedNode && (
          <div className="w-80 border-l border-border bg-card/30 backdrop-blur-sm p-4 overflow-y-auto">
            <NodeEditor
              node={selectedNode}
              onUpdate={updateNode}
              onDelete={deleteNode}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
