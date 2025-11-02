import { useRef, useState, useEffect } from 'react'
import { FoodNode, Edge, ViewTransform } from '@/lib/types'

interface GraphCanvasProps {
  nodes: FoodNode[]
  edges: Edge[]
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string) => void
  onNodeMove: (nodeId: string, x: number, y: number) => void
  onCompare: (node1Id: string, node2Id: string) => void
  viewTransform: ViewTransform
  onViewTransformChange: (transform: ViewTransform) => void
}

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onCompare,
  viewTransform,
  onViewTransformChange,
}: GraphCanvasProps) {
  const canvasRef = useRef<SVGSVGElement>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const NODE_RADIUS = 40

  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - viewTransform.x) / viewTransform.scale,
      y: (screenY - viewTransform.y) / viewTransform.scale,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<SVGCircleElement>, nodeId: string) => {
    if (e.button === 2 || e.shiftKey) {
      e.stopPropagation()
      setConnectingFrom(nodeId)
      return
    }

    e.stopPropagation()
    onNodeSelect(nodeId)

    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const worldPos = screenToWorld(e.clientX, e.clientY)
    setDraggingNode(nodeId)
    setDragOffset({
      x: worldPos.x - node.x,
      y: worldPos.y - node.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    setMousePos(worldPos)

    if (draggingNode) {
      onNodeMove(draggingNode, worldPos.x - dragOffset.x, worldPos.y - dragOffset.y)
    } else if (isPanning) {
      onViewTransformChange({
        ...viewTransform,
        x: viewTransform.x + (e.clientX - panStart.x),
        y: viewTransform.y + (e.clientY - panStart.y),
      })
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (connectingFrom) {
      const target = e.target as Element
      const nodeId = target.getAttribute('data-node-id')
      if (nodeId && nodeId !== connectingFrom) {
        onCompare(connectingFrom, nodeId)
      }
      setConnectingFrom(null)
    }

    setDraggingNode(null)
    setIsPanning(false)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0 && !e.shiftKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      onNodeSelect('')
    }
  }

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.3, Math.min(3, viewTransform.scale * delta))

    const worldPos = screenToWorld(e.clientX, e.clientY)

    onViewTransformChange({
      x: e.clientX - worldPos.x * newScale,
      y: e.clientY - worldPos.y * newScale,
      scale: newScale,
    })
  }

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    window.addEventListener('contextmenu', handleContextMenu)
    return () => window.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  return (
    <svg
      ref={canvasRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="oklch(0.35 0.02 250)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="100%" height="100%" fill="url(#grid)" />

      <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
        {edges.map((edge) => {
          const sourceNode = nodes.find(n => n.id === edge.source)
          const targetNode = nodes.find(n => n.id === edge.target)
          if (!sourceNode || !targetNode) return null

          const similarity = edge.similarity || 0
          const edgeColor = similarity > 0.7 ? 'oklch(0.68 0.20 140)' : 
                           similarity > 0.4 ? 'oklch(0.72 0.15 70)' : 
                           'oklch(0.62 0.22 15)'

          return (
            <line
              key={edge.id}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={edgeColor}
              strokeWidth="3"
              opacity="0.6"
              strokeDasharray={similarity > 0 ? 'none' : '5,5'}
            />
          )
        })}

        {connectingFrom && (
          <line
            x1={nodes.find(n => n.id === connectingFrom)?.x}
            y1={nodes.find(n => n.id === connectingFrom)?.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="oklch(0.70 0.18 50)"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.7"
          />
        )}

        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId
          const label = node.foodData.description
          const truncatedLabel = label.length > 20 ? label.substring(0, 20) + '...' : label

          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={node.color}
                stroke={isSelected ? 'oklch(0.70 0.18 50)' : 'oklch(0.90 0.02 250)'}
                strokeWidth={isSelected ? 4 : 2}
                filter={isSelected ? 'url(#glow)' : undefined}
                className="cursor-pointer hover:brightness-110 transition-all"
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                data-node-id={node.id}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="12"
                fontWeight="600"
                pointerEvents="none"
                className="select-none"
              >
                {truncatedLabel}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
