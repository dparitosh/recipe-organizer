import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { FoodNode, Edge, GraphData, ViewTransform, SearchResult } from '@/lib/types'
import { searchFoods, getFoodDetails, getFoodCategory, getCategoryColor, calculateNutrientSimilarity } from '@/lib/foodData'
import { GraphCanvas } from '@/components/GraphCanvas'
import { FoodDetailPanel } from '@/components/FoodDetailPanel'
import { SearchBar } from '@/components/SearchBar'
import { EmptyState } from '@/components/EmptyState'
import { Toolbar } from '@/components/Toolbar'
import { Toaster } from '@/components/ui/sonner'
import { AppleLogo } from '@phosphor-icons/react'
import { toast } from 'sonner'

function App() {
  const [graphData, setGraphData] = useKV<GraphData>('food-graph-data', { nodes: [], edges: [] })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    x: 400,
    y: 300,
    scale: 1,
  })

  const nodes = graphData?.nodes || []
  const edges = graphData?.edges || []
  const selectedNode = nodes.find(n => n.id === selectedNodeId)

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchFoods(query, 15)
      setSearchResults(results)
    } catch (error) {
      toast.error('Failed to search foods')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const addFoodNode = async (result: SearchResult, x?: number, y?: number) => {
    const existingNode = nodes.find(n => n.foodData.fdcId === result.fdcId)
    if (existingNode) {
      setSelectedNodeId(existingNode.id)
      toast.info('Food already added to graph')
      return
    }

    const foodData = await getFoodDetails(result.fdcId)
    if (!foodData) {
      toast.error('Failed to load food details')
      return
    }

    const category = getFoodCategory(foodData.description, foodData.foodCategory)
    const newNode: FoodNode = {
      id: `food-${Date.now()}`,
      x: x ?? 400,
      y: y ?? 300,
      foodData,
      category,
      color: getCategoryColor(category),
    }

    setGraphData((current) => ({
      nodes: [...(current?.nodes || []), newNode],
      edges: current?.edges || [],
    }))

    setSelectedNodeId(newNode.id)
    setSearchResults([])
    toast.success(`Added ${foodData.description}`)
  }

  const deleteNode = (nodeId: string) => {
    setGraphData((current) => ({
      nodes: (current?.nodes || []).filter((node) => node.id !== nodeId),
      edges: (current?.edges || []).filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    }))
    setSelectedNodeId(null)
    toast.success('Food removed')
  }

  const moveNode = (nodeId: string, x: number, y: number) => {
    setGraphData((current) => ({
      nodes: (current?.nodes || []).map((node) =>
        node.id === nodeId ? { ...node, x, y } : node
      ),
      edges: current?.edges || [],
    }))
  }

  const compareNodes = (node1Id: string, node2Id: string) => {
    const node1 = nodes.find(n => n.id === node1Id)
    const node2 = nodes.find(n => n.id === node2Id)
    
    if (!node1 || !node2) return

    const edgeExists = edges.some(
      (edge) => 
        (edge.source === node1Id && edge.target === node2Id) ||
        (edge.source === node2Id && edge.target === node1Id)
    )

    if (edgeExists) {
      toast.info('Comparison already exists')
      return
    }

    const similarity = calculateNutrientSimilarity(node1.foodData, node2.foodData)

    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: node1Id,
      target: node2Id,
      similarity,
    }

    setGraphData((current) => ({
      nodes: current?.nodes || [],
      edges: [...(current?.edges || []), newEdge],
    }))

    toast.success(`Comparison added (${Math.round(similarity * 100)}% similar)`)
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

    const width = maxX - minX + 300
    const height = maxY - minY + 300
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const scaleX = window.innerWidth / width
    const scaleY = (window.innerHeight - 150) / height
    const scale = Math.min(scaleX, scaleY, 1.5)

    setViewTransform({
      x: window.innerWidth / 2 - centerX * scale,
      y: (window.innerHeight - 100) / 2 - centerY * scale,
      scale,
    })

    toast.success('View fitted')
  }

  const zoomIn = () => {
    setViewTransform((current) => ({
      ...current,
      scale: Math.min(3, current.scale * 1.2),
    }))
  }

  const zoomOut = () => {
    setViewTransform((current) => ({
      ...current,
      scale: Math.max(0.3, current.scale / 1.2),
    }))
  }

  const exportGraph = () => {
    const dataStr = JSON.stringify(graphData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `food-comparison-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    toast.success('Data exported')
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
        <div className="px-6 py-4 flex items-center gap-3">
          <AppleLogo className="text-primary" size={32} weight="duotone" />
          <h1 className="text-2xl font-bold tracking-tight">Food Data Explorer</h1>
        </div>
      </header>

      <div className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-4">
        <SearchBar 
          onSearch={handleSearch}
          onSelectResult={addFoodNode}
          results={searchResults}
          isSearching={isSearching}
        />
      </div>

      <Toolbar
        onClearGraph={clearGraph}
        onFitView={fitView}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onExport={exportGraph}
        foodCount={nodes.length}
        comparisonCount={edges.length}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNodeMove={moveNode}
            onCompare={compareNodes}
            viewTransform={viewTransform}
            onViewTransformChange={setViewTransform}
          />
          {nodes.length === 0 && <EmptyState />}
        </div>

        {selectedNode && (
          <div className="w-96 border-l border-border bg-card/30 backdrop-blur-sm overflow-y-auto">
            <FoodDetailPanel
              node={selectedNode}
              allNodes={nodes}
              onDelete={deleteNode}
              onCompare={compareNodes}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
