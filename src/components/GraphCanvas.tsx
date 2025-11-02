import { useRef, useEffect, useState } from 'react'
import { Node, Edge, ViewTransform } from '@/lib/types'
import * as d3 from 'd3'

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string | null) => void
  onNodeMove: (nodeId: string, x: number, y: number) => void
  onNodeDoubleClick: (x: number, y: number) => void
  onEdgeCreate: (sourceId: string, targetId: string) => void
  isCreatingEdge: boolean
  setIsCreatingEdge: (value: boolean) => void
  viewTransform: ViewTransform
  onViewTransformChange: (transform: ViewTransform) => void
}

const NODE_RADIUS = 30
const NODE_COLORS = [
  'oklch(0.68 0.18 25)',
  'oklch(0.62 0.24 295)', 
  'oklch(0.75 0.20 130)',
  'oklch(0.70 0.18 50)',
  'oklch(0.65 0.20 260)',
  'oklch(0.72 0.18 340)',
]

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onNodeDoubleClick,
  onEdgeCreate,
  isCreatingEdge,
  setIsCreatingEdge,
  viewTransform,
  onViewTransformChange,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [edgeStart, setEdgeStart] = useState<string | null>(null)
  const [tempEdgeEnd, setTempEdgeEnd] = useState<{ x: number; y: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button === 0 && e.shiftKey) {
      e.stopPropagation()
      setEdgeStart(nodeId)
      setIsCreatingEdge(true)
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        setTempEdgeEnd({ x: node.x, y: node.y })
      }
    } else if (e.button === 0) {
      e.stopPropagation()
      setDraggingNode(nodeId)
      onNodeSelect(nodeId)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - viewTransform.x) / viewTransform.scale
    const y = (e.clientY - rect.top - viewTransform.y) / viewTransform.scale

    if (draggingNode) {
      onNodeMove(draggingNode, x, y)
    } else if (isCreatingEdge && edgeStart) {
      setTempEdgeEnd({ x, y })
    } else if (isPanning && panStart) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      onViewTransformChange({
        ...viewTransform,
        x: viewTransform.x + dx,
        y: viewTransform.y + dy,
      })
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = (e: React.MouseEvent, nodeId?: string) => {
    if (isCreatingEdge && edgeStart && nodeId && nodeId !== edgeStart) {
      onEdgeCreate(edgeStart, nodeId)
    }
    
    setDraggingNode(null)
    setEdgeStart(null)
    setTempEdgeEnd(null)
    setIsCreatingEdge(false)
    setIsPanning(false)
    setPanStart(null)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.shiftKey) {
      onNodeSelect(null)
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - viewTransform.x) / viewTransform.scale
    const y = (e.clientY - rect.top - viewTransform.y) / viewTransform.scale
    onNodeDoubleClick(x, y)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (!svgRef.current) return

    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(5, viewTransform.scale * delta))

    const newX = mouseX - (mouseX - viewTransform.x) * (newScale / viewTransform.scale)
    const newY = mouseY - (mouseY - viewTransform.y) * (newScale / viewTransform.scale)

    onViewTransformChange({
      x: newX,
      y: newY,
      scale: newScale,
    })
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onMouseUp={(e) => handleMouseUp(e)}
      onMouseDown={handleCanvasMouseDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="oklch(0.60 0.02 250)" />
        </marker>
        <pattern
          id="grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="oklch(0.35 0.02 250)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>
      </defs>

      <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
        <rect
          x="-5000"
          y="-5000"
          width="10000"
          height="10000"
          fill="url(#grid)"
        />

        <g className="edges">
          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source)
            const target = nodes.find((n) => n.id === edge.target)
            if (!source || !target) return null

            const dx = target.x - source.x
            const dy = target.y - source.y
            const angle = Math.atan2(dy, dx)
            const targetX = target.x - NODE_RADIUS * Math.cos(angle)
            const targetY = target.y - NODE_RADIUS * Math.sin(angle)

            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={targetX}
                y2={targetY}
                stroke="oklch(0.60 0.02 250)"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            )
          })}
          {isCreatingEdge && edgeStart && tempEdgeEnd && (() => {
            const source = nodes.find((n) => n.id === edgeStart)
            if (!source) return null
            return (
              <line
                x1={source.x}
                y1={source.y}
                x2={tempEdgeEnd.x}
                y2={tempEdgeEnd.y}
                stroke="oklch(0.72 0.15 195)"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            )
          })()}
        </g>

        <g className="nodes">
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onMouseUp={(e) => handleMouseUp(e, node.id)}
              className="cursor-pointer"
              style={{ cursor: draggingNode === node.id ? 'grabbing' : 'grab' }}
            >
              <circle
                r={NODE_RADIUS}
                fill={node.color}
                stroke={selectedNodeId === node.id ? 'oklch(0.72 0.15 195)' : 'oklch(0.90 0.02 250)'}
                strokeWidth={selectedNodeId === node.id ? 3 : 2}
                className="transition-all duration-200"
                style={{
                  filter: selectedNodeId === node.id ? 'drop-shadow(0 0 8px oklch(0.72 0.15 195))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              />
              <text
                textAnchor="middle"
                dy=".3em"
                fill="white"
                fontSize="13"
                fontWeight="600"
                pointerEvents="none"
                style={{ userSelect: 'none' }}
              >
                {node.label}
              </text>
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}
