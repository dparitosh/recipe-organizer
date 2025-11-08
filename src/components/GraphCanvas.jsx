import { useEffect, useRef, useState } from 'react'

const NODE_RADIUS = 40

function screenToWorld(viewTransform, screenX, screenY) {
  return {
    x: (screenX - viewTransform.x) / viewTransform.scale,
    y: (screenY - viewTransform.y) / viewTransform.scale,
  }
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
}) {
  const canvasRef = useRef(null)
  const [draggingNode, setDraggingNode] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseDown = (event, nodeId) => {
    if (event.button === 2 || event.shiftKey) {
      event.stopPropagation()
      setConnectingFrom(nodeId)
      return
    }

    event.stopPropagation()
    onNodeSelect(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const worldPos = screenToWorld(viewTransform, event.clientX, event.clientY)
    setDraggingNode(nodeId)
    setDragOffset({
      x: worldPos.x - node.x,
      y: worldPos.y - node.y,
    })
  }

  const handleMouseMove = (event) => {
    const worldPos = screenToWorld(viewTransform, event.clientX, event.clientY)
    setMousePos(worldPos)

    if (draggingNode) {
      onNodeMove(draggingNode, worldPos.x - dragOffset.x, worldPos.y - dragOffset.y)
    } else if (isPanning) {
      onViewTransformChange({
        ...viewTransform,
        x: viewTransform.x + (event.clientX - panStart.x),
        y: viewTransform.y + (event.clientY - panStart.y),
      })
      setPanStart({ x: event.clientX, y: event.clientY })
    }
  }

  const handleMouseUp = (event) => {
    if (connectingFrom) {
      const target = event.target
      const nodeId = target?.getAttribute?.('data-node-id')
      if (nodeId && nodeId !== connectingFrom) {
        onCompare(connectingFrom, nodeId)
      }
      setConnectingFrom(null)
    }

    setDraggingNode(null)
    setIsPanning(false)
  }

  const handleCanvasMouseDown = (event) => {
    if (event.button === 0 && !event.shiftKey) {
      setIsPanning(true)
      setPanStart({ x: event.clientX, y: event.clientY })
      onNodeSelect('')
    }
  }

  const handleWheel = (event) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.3, Math.min(3, viewTransform.scale * delta))

    const worldPos = screenToWorld(viewTransform, event.clientX, event.clientY)

    onViewTransformChange({
      x: event.clientX - worldPos.x * newScale,
      y: event.clientY - worldPos.y * newScale,
      scale: newScale,
    })
  }

  useEffect(() => {
    const handleContextMenu = (event) => {
      event.preventDefault()
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
          const sourceNode = nodes.find((n) => n.id === edge.source)
          const targetNode = nodes.find((n) => n.id === edge.target)
          if (!sourceNode || !targetNode) return null

          const similarity = edge.similarity || 0
          const edgeColor =
            similarity > 0.7
              ? 'oklch(0.68 0.20 140)'
              : similarity > 0.4
              ? 'oklch(0.72 0.15 70)'
              : 'oklch(0.62 0.22 15)'

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
            x1={nodes.find((n) => n.id === connectingFrom)?.x || 0}
            y1={nodes.find((n) => n.id === connectingFrom)?.y || 0}
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
          const truncatedLabel = label.length > 20 ? `${label.substring(0, 20)}...` : label

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
                onMouseDown={(event) => handleMouseDown(event, node.id)}
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
