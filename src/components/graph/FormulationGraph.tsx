import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { createCytoscapeConfig, applyLayout, cytoscapeLayouts } from '@/lib/graph/cytoscape-config'
import { Neo4jResult } from '@/lib/schemas/integration'

interface FormulationGraphProps {
  data: Neo4jResult | null
  onNodeSelect?: (nodeId: string) => void
  onEdgeSelect?: (edgeId: string) => void
  layout?: keyof typeof cytoscapeLayouts
  height?: string
}

export function FormulationGraph({
  data,
  onNodeSelect,
  onEdgeSelect,
  layout = 'hierarchical',
  height = '600px'
}: FormulationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const config = createCytoscapeConfig(containerRef.current)
    cyRef.current = cytoscape(config)
    setIsReady(true)

    const cy = cyRef.current

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      onNodeSelect?.(node.id())
    })

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target
      onEdgeSelect?.(edge.id())
    })

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!cyRef.current || !data || !isReady) return

    const cy = cyRef.current
    cy.elements().remove()

    data.nodes.forEach(node => {
      cy.add({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.properties.name || node.properties.description || node.id,
          type: node.labels[0]?.toLowerCase() || 'default',
          selectedColor: 'oklch(0.70 0.18 50)',
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
          type: rel.type,
          label: rel.properties.label,
          ...rel.properties
        }
      })
    })

    applyLayout(cy, layout)
  }, [data, isReady, layout])

  useEffect(() => {
    if (!cyRef.current || !isReady) return
    applyLayout(cyRef.current, layout)
  }, [layout, isReady])

  return (
    <div className="relative w-full bg-background border border-border rounded-lg overflow-hidden">
      <div 
        ref={containerRef} 
        style={{ height }}
        className="w-full"
      />
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-muted-foreground">No graph data to display</p>
        </div>
      )}
    </div>
  )
}

export function useFormulationGraph() {
  const cyRef = useRef<cytoscape.Core | null>(null)

  const setCytoscapeInstance = (instance: cytoscape.Core) => {
    cyRef.current = instance
  }

  const addNode = (id: string, label: string, type: string, data?: any) => {
    if (!cyRef.current) return
    cyRef.current.add({
      group: 'nodes',
      data: { id, label, type, ...data }
    })
  }

  const addEdge = (source: string, target: string, type: string, label?: string) => {
    if (!cyRef.current) return
    cyRef.current.add({
      group: 'edges',
      data: {
        id: `${source}-${target}`,
        source,
        target,
        type,
        label
      }
    })
  }

  const removeNode = (id: string) => {
    if (!cyRef.current) return
    cyRef.current.getElementById(id).remove()
  }

  const clearGraph = () => {
    if (!cyRef.current) return
    cyRef.current.elements().remove()
  }

  const fitView = () => {
    if (!cyRef.current) return
    cyRef.current.fit(undefined, 50)
  }

  const centerOnNode = (nodeId: string) => {
    if (!cyRef.current) return
    const node = cyRef.current.getElementById(nodeId)
    if (node.length > 0) {
      cyRef.current.animate({
        center: { eles: node },
        duration: 500
      })
    }
  }

  return {
    setCytoscapeInstance,
    addNode,
    addEdge,
    removeNode,
    clearGraph,
    fitView,
    centerOnNode
  }
}
