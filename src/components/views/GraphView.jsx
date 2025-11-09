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

const CORPORATE_PALETTE = {
  background: '#f8fafc',
  backgroundDark: '#0f172a',
  border: 'rgba(15, 23, 42, 0.18)',
  edgeLabelBorder: 'rgba(148, 163, 184, 0.6)',
  edgeLabelBackground: '#f1f5f9',
  edgeLabelText: '#1f2937',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  sky500: '#0ea5e9',
  sky600: '#0284c7',
  teal600: '#0f766e',
  indigo700: '#4338ca',
  violet600: '#7c3aed',
  violet800: '#4c1d95',
  slate600: '#475569',
}

const CORPORATE_NODE_COLORS = {
  __default__: '#1e293b',
  Formulation: CORPORATE_PALETTE.blue700,
  Ingredient: CORPORATE_PALETTE.sky500,
  Food: CORPORATE_PALETTE.sky500,
  Nutrient: CORPORATE_PALETTE.teal600,
  ProcessStep: CORPORATE_PALETTE.indigo700,
  Process: CORPORATE_PALETTE.indigo700,
  Supplier: CORPORATE_PALETTE.blue600,
  Plant: CORPORATE_PALETTE.sky600,
  Recipe: CORPORATE_PALETTE.blue700,
  MasterRecipe: CORPORATE_PALETTE.blue600,
  ManufacturingRecipe: CORPORATE_PALETTE.indigo700,
  AIInsight: CORPORATE_PALETTE.violet600,
  CalculationSnapshot: CORPORATE_PALETTE.violet800,
  SalesOrder: CORPORATE_PALETTE.violet600,
}

const FALLBACK_NODE_SHAPES = {
  Formulation: 'hexagon',
  Ingredient: 'roundrectangle',
  Food: 'roundrectangle',
  Nutrient: 'diamond',
  Process: 'rectangle',
  ProcessStep: 'hexagon',
  Recipe: 'round-rectangle',
  MasterRecipe: 'hexagon',
  ManufacturingRecipe: 'hexagon',
  Plant: 'round-diamond',
  SalesOrder: 'tag',
}

const CORPORATE_RELATIONSHIP_COLORS = {
  __default__: CORPORATE_PALETTE.blue600,
  USES: CORPORATE_PALETTE.blue600,
  HAS_NUTRIENT: CORPORATE_PALETTE.teal600,
  EXECUTES: CORPORATE_PALETTE.indigo700,
  PRODUCED_AT: CORPORATE_PALETTE.sky600,
  PROCURED_FROM: CORPORATE_PALETTE.blue700,
  APPLIES_TO: CORPORATE_PALETTE.violet600,
  SUPPORTS: CORPORATE_PALETTE.slate600,
}

const DEFAULT_NODE_COLOR = CORPORATE_NODE_COLORS.__default__
const DEFAULT_NODE_SHAPE = 'round-rectangle'
const DEFAULT_NODE_TEXT_COLOR = '#f8fafc'
const DEFAULT_NODE_BORDER_COLOR = CORPORATE_PALETTE.border
const DEFAULT_EDGE_COLOR = CORPORATE_RELATIONSHIP_COLORS.__default__
const DEFAULT_EDGE_STYLE = 'solid'
const DEFAULT_EDGE_WIDTH = 2
const DEFAULT_EDGE_TARGET_ARROW = 'triangle'
const DEFAULT_EDGE_SOURCE_ARROW = 'none'

const HEX_6_DIGIT = /^#(?:[0-9a-fA-F]{6})$/
const HEX_3_DIGIT = /^#(?:[0-9a-fA-F]{3})$/

const clamp01 = (value) => Math.min(Math.max(value, 0), 1)

const normalizeHexColor = (value, fallback = null) => {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  if (HEX_6_DIGIT.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  if (HEX_3_DIGIT.test(trimmed)) {
    const hex = trimmed.slice(1)
    const expanded = `#${hex
      .split('')
      .map((char) => char + char)
      .join('')}`
    return expanded.toLowerCase()
  }

  return fallback
}

const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex)
  if (!normalized) {
    return null
  }

  const value = normalized.slice(1)
  const int = parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return { r, g, b }
}

const mixHexColors = (colorA, colorB, amountA = 0.5) => {
  const rgbA = hexToRgb(colorA)
  const rgbB = hexToRgb(colorB)
  if (!rgbA || !rgbB) {
    return normalizeHexColor(colorA) || normalizeHexColor(colorB)
  }

  const ratioA = clamp01(amountA)
  const ratioB = 1 - ratioA
  const mixed = {
    r: Math.round(rgbA.r * ratioA + rgbB.r * ratioB),
    g: Math.round(rgbA.g * ratioA + rgbB.g * ratioB),
    b: Math.round(rgbA.b * ratioA + rgbB.b * ratioB),
  }

  const toHex = (value) => value.toString(16).padStart(2, '0')
  return `#${toHex(mixed.r)}${toHex(mixed.g)}${toHex(mixed.b)}`
}

const calculateLuminance = (hexColor) => {
  const rgb = hexToRgb(hexColor)
  if (!rgb) {
    return 0
  }

  const channelToLinear = (channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  const r = channelToLinear(rgb.r)
  const g = channelToLinear(rgb.g)
  const b = channelToLinear(rgb.b)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const pickAccessibleTextColor = (hexColor) => {
  const luminance = calculateLuminance(hexColor)
  return luminance > 0.55 ? '#0f172a' : '#f8fafc'
}

const buildBorderColor = (hexColor) => {
  const normalized = normalizeHexColor(hexColor)
  if (!normalized) {
    return DEFAULT_NODE_BORDER_COLOR
  }
  return mixHexColors(normalized, '#ffffff', 0.3)
}

const getCorporateNodeColor = (type, candidate) => {
  if (CORPORATE_NODE_COLORS[type]) {
    return CORPORATE_NODE_COLORS[type]
  }
  const normalized = normalizeHexColor(candidate)
  if (normalized) {
    return normalized
  }
  return DEFAULT_NODE_COLOR
}

const getCorporateRelationshipColor = (type, candidate) => {
  if (CORPORATE_RELATIONSHIP_COLORS[type]) {
    return CORPORATE_RELATIONSHIP_COLORS[type]
  }
  const normalized = normalizeHexColor(candidate)
  if (normalized) {
    return normalized
  }
  return DEFAULT_EDGE_COLOR
}

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
    const defaultsColor = getCorporateNodeColor('__default__', schema?.defaults?.node?.color)
    const defaultsShape = schema?.defaults?.node?.shape || DEFAULT_NODE_SHAPE

    const defaults = {
      color: defaultsColor,
      shape: defaultsShape,
      textColor: pickAccessibleTextColor(defaultsColor),
      borderColor: buildBorderColor(defaultsColor),
    }

    const colors = {}
    const shapes = { ...FALLBACK_NODE_SHAPES }
    const textColors = {}
    const borderColors = {}

    Object.entries(CORPORATE_NODE_COLORS).forEach(([type, color]) => {
      if (type === '__default__') {
        return
      }
      colors[type] = color
      textColors[type] = pickAccessibleTextColor(color)
      borderColors[type] = buildBorderColor(color)
    })

    if (schema?.node_types) {
      schema.node_types.forEach((typeConfig) => {
        if (!typeConfig?.type) {
          return
        }

        const paletteColor = getCorporateNodeColor(typeConfig.type, typeConfig.color)
        colors[typeConfig.type] = paletteColor
        textColors[typeConfig.type] = pickAccessibleTextColor(paletteColor)
        borderColors[typeConfig.type] = buildBorderColor(paletteColor)

        if (typeConfig.shape) {
          shapes[typeConfig.type] = typeConfig.shape
        }
      })
    }

    return { colors, shapes, textColors, borderColors, defaults }
  }, [schema])

  const edgeStyleMap = useMemo(() => {
    const defaultsColor = getCorporateRelationshipColor('__default__', schema?.defaults?.edge?.color)
    const defaults = {
      color: defaultsColor,
      style: schema?.defaults?.edge?.style || DEFAULT_EDGE_STYLE,
      width: schema?.defaults?.edge?.width || DEFAULT_EDGE_WIDTH,
      target_arrow: schema?.defaults?.edge?.target_arrow || DEFAULT_EDGE_TARGET_ARROW,
      source_arrow: schema?.defaults?.edge?.source_arrow || DEFAULT_EDGE_SOURCE_ARROW,
    }

    const lookup = {}

    if (schema?.relationship_types) {
      schema.relationship_types.forEach((relConfig) => {
        if (!relConfig?.type) {
          return
        }

        lookup[relConfig.type] = {
          color: getCorporateRelationshipColor(relConfig.type, relConfig.color),
          style: relConfig.style || defaults.style,
          width: relConfig.width || defaults.width,
          target_arrow: relConfig.target_arrow || defaults.target_arrow,
          source_arrow: relConfig.source_arrow || defaults.source_arrow,
          label: relConfig.label || relConfig.type,
          sources: relConfig.allowed_source_types || [],
          targets: relConfig.allowed_target_types || [],
        }
      })
    }

    return { defaults, lookup }
  }, [schema])

  const getNodeColor = useCallback(
    (type) => nodeStyleMap.colors[type] || nodeStyleMap.defaults.color,
    [nodeStyleMap]
  )

  const getNodeShape = useCallback(
    (type) => nodeStyleMap.shapes[type] || nodeStyleMap.defaults.shape,
    [nodeStyleMap]
  )

  const getNodeTextColor = useCallback(
    (type) => nodeStyleMap.textColors?.[type] || nodeStyleMap.defaults.textColor || DEFAULT_NODE_TEXT_COLOR,
    [nodeStyleMap]
  )

  const getNodeBorderColor = useCallback(
    (type) => nodeStyleMap.borderColors?.[type] || nodeStyleMap.defaults.borderColor || DEFAULT_NODE_BORDER_COLOR,
    [nodeStyleMap]
  )

  const getEdgeColor = useCallback(
    (type) => edgeStyleMap.lookup[type]?.color || edgeStyleMap.defaults.color,
    [edgeStyleMap]
  )

  const getEdgeStyle = useCallback(
    (type) => edgeStyleMap.lookup[type]?.style || edgeStyleMap.defaults.style,
    [edgeStyleMap]
  )

  const getEdgeWidth = useCallback(
    (type) => edgeStyleMap.lookup[type]?.width || edgeStyleMap.defaults.width,
    [edgeStyleMap]
  )

  const getEdgeArrow = useCallback(
    (type) => edgeStyleMap.lookup[type]?.target_arrow || edgeStyleMap.defaults.target_arrow,
    [edgeStyleMap]
  )

  const getEdgeSourceArrow = useCallback(
    (type) => edgeStyleMap.lookup[type]?.source_arrow || edgeStyleMap.defaults.source_arrow,
    [edgeStyleMap]
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
            'color': (ele) => getNodeTextColor(ele.data('type')),
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-weight': 600,
            'width': '64px',
            'height': '64px',
            'shape': (ele) => getNodeShape(ele.data('type')),
            'border-width': '2px',
            'border-color': (ele) => getNodeBorderColor(ele.data('type')),
            'text-outline-color': (ele) => getNodeBorderColor(ele.data('type')),
            'text-outline-width': '1.5px',
            'background-opacity': 0.98,
            'shadow-blur': 18,
            'shadow-color': 'rgba(15, 23, 42, 0.2)',
            'shadow-opacity': 0.7,
            'shadow-offset-x': 0,
            'shadow-offset-y': 6,
            'overlay-padding': 4,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': (ele) => getEdgeWidth(ele.data('type')),
            'line-color': (ele) => getEdgeColor(ele.data('type')),
            'target-arrow-color': (ele) => getEdgeColor(ele.data('type')),
            'target-arrow-shape': (ele) => getEdgeArrow(ele.data('type')),
            'source-arrow-color': (ele) => getEdgeColor(ele.data('type')),
            'source-arrow-shape': (ele) => getEdgeSourceArrow(ele.data('type')),
            'arrow-scale': 1.05,
            'line-style': (ele) => getEdgeStyle(ele.data('type')),
            'curve-style': 'bezier',
            'line-cap': 'round',
            'opacity': 0.92,
            'label': 'data(label)',
            'color': CORPORATE_PALETTE.edgeLabelText,
            'font-size': '10px',
            'font-weight': 500,
            'text-rotation': 'autorotate',
            'text-background-color': CORPORATE_PALETTE.edgeLabelBackground,
            'text-background-opacity': 0.95,
            'text-background-padding': '4px',
            'text-border-width': 1,
            'text-border-color': CORPORATE_PALETTE.edgeLabelBorder,
            'text-border-opacity': 0.5,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': '4px',
            'border-color': CORPORATE_PALETTE.blue600,
            'shadow-blur': 24,
            'shadow-color': 'rgba(37, 99, 235, 0.35)',
            'shadow-opacity': 0.9,
            'z-index': 999,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': CORPORATE_PALETTE.blue600,
            'target-arrow-color': CORPORATE_PALETTE.blue600,
            'source-arrow-color': CORPORATE_PALETTE.blue600,
            'width': 4,
            'opacity': 1,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'opacity': 1,
            'border-color': CORPORATE_PALETTE.blue600,
            'border-width': '3px',
          },
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.12,
          },
        },
        {
          selector: '.filter-dim',
          style: {
            'opacity': 0.1,
          },
        },
        {
          selector: 'node.filter-focus',
          style: {
            'border-color': CORPORATE_PALETTE.blue600,
            'border-width': '4px',
            'opacity': 1,
            'shadow-blur': 28,
            'shadow-color': 'rgba(37, 99, 235, 0.3)',
          },
        },
        {
          selector: 'edge.filter-edge',
          style: {
            'line-color': CORPORATE_PALETTE.blue600,
            'target-arrow-color': CORPORATE_PALETTE.blue600,
            'source-arrow-color': CORPORATE_PALETTE.blue600,
            'width': (ele) => Math.max(getEdgeWidth(ele.data('type')), 3),
            'opacity': 1,
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
  }, [
    graphData,
    layout,
    normalizedNodes,
    normalizedEdges,
    getNodeColor,
    getNodeShape,
    getNodeTextColor,
    getNodeBorderColor,
    getEdgeColor,
    getEdgeStyle,
    getEdgeWidth,
    getEdgeArrow,
    getEdgeSourceArrow,
  ])

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.layout(getLayoutOptions(layout)).run()
    }
  }, [layout])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    cy.batch(() => {
      cy.elements().removeClass('filter-dim filter-focus filter-edge')

      if (filterNodeType === 'all') {
        return
      }

      const matchingNodes = cy
        .nodes()
        .filter((node) => node.data('type') === filterNodeType)

      if (matchingNodes.length === 0) {
        return
      }

      const connectedEdges = matchingNodes.connectedEdges()

      matchingNodes.addClass('filter-focus')
      connectedEdges.addClass('filter-edge')

      cy.nodes().difference(matchingNodes).addClass('filter-dim')
      cy.edges().difference(connectedEdges).addClass('filter-dim')
    })
  }, [filterNodeType, normalizedNodes, normalizedEdges])

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

  const observedRelationshipTypes = useMemo(() => {
    if (!normalizedEdges.length) {
      return []
    }
    return Array.from(new Set(normalizedEdges.map((edge) => edge.type).filter(Boolean)))
  }, [normalizedEdges])

  const schemaRelationshipTypes = useMemo(() => {
    if (!schema?.relationship_types?.length) {
      return []
    }
    return schema.relationship_types.map((relConfig) => relConfig.type).filter(Boolean)
  }, [schema])

  const relationshipLegendTypes = useMemo(() => {
    if (observedRelationshipTypes.length) {
      return observedRelationshipTypes
    }
    if (schemaRelationshipTypes.length) {
      return schemaRelationshipTypes
    }
    return Object.keys(edgeStyleMap.lookup)
  }, [observedRelationshipTypes, schemaRelationshipTypes, edgeStyleMap.lookup])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Graph Explorer</h2>
          <p className="text-muted-foreground mt-1">
            Interactive visualization of formulation relationships
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
          {filterNodeType !== 'all' && (
            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              Filter: {filterNodeType}
            </Badge>
          )}
        </div>
      </div>

      <Card className="p-6 border border-border/70 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 flex flex-wrap gap-2">
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

          <div className="flex flex-wrap items-center gap-2">
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
                variant="outline"
                className={`cursor-pointer border transition-colors dark:border-slate-700 ${filterNodeType === 'all' ? 'bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-100' : 'bg-transparent text-muted-foreground'}`}
                onClick={() => setFilterNodeType('all')}
              >
                All Types
              </Badge>
              {nodeTypes.map((type) => {
                const isActive = filterNodeType === type
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className={`cursor-pointer border transition-colors dark:border-slate-700 ${isActive ? 'shadow-sm' : ''}`}
                    onClick={() => setFilterNodeType(type)}
                    style={{
                      backgroundColor: isActive ? getNodeColor(type) : 'transparent',
                      color: isActive ? getNodeTextColor(type) : undefined,
                      borderColor: getNodeBorderColor(type),
                    }}
                  >
                    {type}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div 
              ref={containerRef}
              className="w-full h-[620px] rounded-xl border border-border/60 bg-[#f8fafc] dark:bg-[#0f172a] shadow-inner transition-colors"
            />
          </div>

          <div className="space-y-4">
            {selectedNode ? (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border"
                    style={{
                      backgroundColor: getNodeColor(selectedNode.type),
                      color: getNodeTextColor(selectedNode.type),
                      borderColor: getNodeBorderColor(selectedNode.type),
                    }}
                  >
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
              <div className="space-y-3">
                {legendTypes.map((type) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded border"
                        style={{
                          backgroundColor: getNodeColor(type),
                          borderColor: getNodeBorderColor(type),
                        }}
                      />
                      <span className="font-medium">{type}</span>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {getNodeShape(type)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {relationshipLegendTypes.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Relationship Styles</h3>
                <div className="space-y-3">
                  {relationshipLegendTypes.map((type) => {
                    const config = edgeStyleMap.lookup[type]
                    const label = config?.label || type
                    const sources = (config?.sources?.length ? config.sources : ['Any'])
                    const targets = (config?.targets?.length ? config.targets : ['Any'])
                    const color = getEdgeColor(type)
                    const style = getEdgeStyle(type)
                    return (
                      <div key={type} className="space-y-2 rounded-md border border-border/60 bg-white/80 p-3 text-xs shadow-sm dark:bg-slate-950/50">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{label}</span>
                          <Badge variant="outline" className="border-slate-300 text-[10px] uppercase tracking-wide dark:border-slate-700 dark:text-slate-200">
                            {type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: color, opacity: 0.9 }} />
                          <span className="text-muted-foreground capitalize">{style}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="font-medium uppercase tracking-wide text-slate-600">From</span>
                          {sources.map((source) => (
                            <Badge
                              key={`${type}-source-${source}`}
                              variant="outline"
                              className="border-slate-300 bg-white/70 text-[10px] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                            >
                              {source}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="font-medium uppercase tracking-wide text-slate-600">To</span>
                          {targets.map((target) => (
                            <Badge
                              key={`${type}-target-${target}`}
                              variant="outline"
                              className="border-slate-300 bg-white/70 text-[10px] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                            >
                              {target}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

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
