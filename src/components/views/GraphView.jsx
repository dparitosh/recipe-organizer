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
  ListBullets,
  Info,
} from '@phosphor-icons/react'

const CORPORATE_PALETTE = {
  background: '#f5f7fb',
  edgeLabelText: '#1f2937',
  blue600: '#0F6CBD',
  blue700: '#0B5AA7',
  sky500: '#00A3C4',
  sky600: '#0082A1',
  teal600: '#0D9488',
  indigo700: '#4338CA',
  violet600: '#9333EA',
  violet800: '#7C3AED',
  slate600: '#475569',
  amber500: '#F59E0B',
  orange500: '#F97316',
}

const CORPORATE_NODE_COLORS = {
  __default__: '#164777',
  Formulation: CORPORATE_PALETTE.blue700,
  Ingredient: CORPORATE_PALETTE.sky500,
  Food: '#22C55E',
  Nutrient: CORPORATE_PALETTE.violet600,
  ProcessStep: CORPORATE_PALETTE.orange500,
  Process: '#EA580C',
  Supplier: '#6366F1',
  Plant: '#16A34A',
  Recipe: CORPORATE_PALETTE.blue600,
  MasterRecipe: '#2563EB',
  ManufacturingRecipe: '#DB2777',
  AIInsight: CORPORATE_PALETTE.amber500,
  CalculationSnapshot: '#4C1D95',
  SalesOrder: CORPORATE_PALETTE.violet800,
}

const CORPORATE_NODE_SHAPES = {
  Formulation: 'hexagon',
  Ingredient: 'round-rectangle',
  Food: 'round-rectangle',
  Nutrient: 'diamond',
  Process: 'octagon',
  ProcessStep: 'triangle',
  Recipe: 'hexagon',
  MasterRecipe: 'round-rectangle',
  ManufacturingRecipe: 'octagon',
  Plant: 'round-diamond',
  Supplier: 'ellipse',
  SalesOrder: 'rhomboid',
  AIInsight: 'star',
  CalculationSnapshot: 'rectangle',
}

const CORPORATE_RELATIONSHIP_COLORS = {
  __default__: CORPORATE_PALETTE.blue600,
  USES: CORPORATE_PALETTE.blue600,
  HAS_NUTRIENT: CORPORATE_PALETTE.teal600,
  EXECUTES: CORPORATE_PALETTE.orange500,
  PRODUCED_AT: '#22C55E',
  PROCURED_FROM: CORPORATE_PALETTE.sky600,
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
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

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

const lightenHexColor = (hexColor, intensity = 0.55) => {
  const normalized = normalizeHexColor(hexColor)
  if (!normalized) {
    return hexColor
  }
  const weight = clamp01(intensity)
  return mixHexColors('#ffffff', normalized, weight)
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

const formatTooltipValue = (value) => {
  if (value === null || value === undefined) {
    return '—'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    const preview = value.slice(0, 3).map((entry) => formatTooltipValue(entry))
    const suffix = value.length > 3 ? '…' : ''
    return `${preview.join(', ')}${suffix}`
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (error) {
      return String(value)
    }
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString() : String(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  return String(value)
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
  const [nodeLabelMode, setNodeLabelMode] = useState('name')
  const [showFilters, setShowFilters] = useState(false)
  const [schema, setSchema] = useState(null)
  const [installingSchema, setInstallingSchema] = useState(false)
  const [legendOpen, setLegendOpen] = useState(true)
  const [legendTab, setLegendTab] = useState('nodes')
  const [tooltip, setTooltip] = useState(null)
  const [remoteQuery, setRemoteQuery] = useState('')
  const [searchMode, setSearchMode] = useState('keyword')
  const [searching, setSearching] = useState(false)
  const [searchMeta, setSearchMeta] = useState(null)
  const [resettingSchema, setResettingSchema] = useState(false)
  
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const tooltipTimeoutRef = useRef(null)

  const clearTooltipTimeout = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }
  }, [])

  const showTooltip = useCallback(
    (payload) => {
      if (!payload) {
        return
      }
      clearTooltipTimeout()
      setTooltip(payload)
    },
    [clearTooltipTimeout]
  )

  const hideTooltip = useCallback(
    (immediate = false) => {
      clearTooltipTimeout()
      if (immediate) {
        setTooltip(null)
        return
      }
      tooltipTimeoutRef.current = setTimeout(() => {
        setTooltip(null)
        tooltipTimeoutRef.current = null
      }, 140)
    },
    [clearTooltipTimeout]
  )

  const computeTooltipPosition = useCallback((point, offset = { x: 18, y: 18 }) => {
    if (!point) {
      return { x: 0, y: 0 }
    }

    const container = containerRef.current
    if (!container) {
      return { x: point.x, y: point.y }
    }

    const width = container.clientWidth || 0
    const height = container.clientHeight || 0
    const clampedX = clamp(point.x + offset.x, 12, Math.max(width - 260, 12))
    const clampedY = clamp(point.y + offset.y, 12, Math.max(height - 220, 12))
    return { x: clampedX, y: clampedY }
  }, [])

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

  useEffect(() => {
    return () => {
      clearTooltipTimeout()
    }
  }, [clearTooltipTimeout])

  useEffect(() => {
    setTooltip(null)
  }, [graphData])

  const nodeStyleMap = useMemo(() => {
    const defaultsColor = getCorporateNodeColor('__default__', schema?.defaults?.node?.color)
    const defaultsShape = schema?.defaults?.node?.shape || DEFAULT_NODE_SHAPE
    const defaults = {
      color: defaultsColor,
      shape: defaultsShape,
      textColor: pickAccessibleTextColor(defaultsColor),
      borderColor: buildBorderColor(defaultsColor),
      fillColor: lightenHexColor(defaultsColor, 0.65) || defaultsColor,
    }

    const colors = {}
    const shapes = { ...CORPORATE_NODE_SHAPES }
    const textColors = {}
    const borderColors = {}
    const fillColors = {}

    Object.entries(CORPORATE_NODE_COLORS).forEach(([type, color]) => {
      if (type === '__default__') {
        return
      }
      colors[type] = color
      textColors[type] = pickAccessibleTextColor(color)
      borderColors[type] = buildBorderColor(color)
      fillColors[type] = lightenHexColor(color, 0.6) || color
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
        fillColors[typeConfig.type] = lightenHexColor(paletteColor, 0.6) || paletteColor

        if (typeConfig.shape) {
          shapes[typeConfig.type] = typeConfig.shape
        }
      })
    }

    return { colors, shapes, textColors, borderColors, fillColors, defaults }
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

  const getNodeFillColor = useCallback(
    (type) => nodeStyleMap.fillColors?.[type] || nodeStyleMap.defaults.fillColor || lightenHexColor(nodeStyleMap.defaults.color, 0.6),
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

    const determineLabel = (node) => {
      if (nodeLabelMode === 'type') {
        return node.labels?.[0] || node.properties?.type || 'Unknown'
      }
      if (nodeLabelMode === 'id') {
        return node.id
      }
      return node.properties?.name || node.properties?.label || node.id
    }

    return graphData.nodes.map((node) => ({
      id: node.id,
      label: determineLabel(node),
      type: node.labels?.[0] || 'Unknown',
      properties: node.properties ?? {},
    }))
  }, [graphData, nodeLabelMode])

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
            'background-color': (ele) => getNodeFillColor(ele.data('type')),
            'label': 'data(label)',
            'font-family': 'Inter, "Helvetica Neue", Arial, sans-serif',
            'color': '#111827',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-weight': 400,
            'width': '64px',
            'height': '64px',
            'shape': (ele) => getNodeShape(ele.data('type')),
            'border-width': '2px',
            'border-color': (ele) => getNodeColor(ele.data('type')),
            'text-outline-width': 0,
            'background-opacity': 0.97,
            'shadow-blur': 10,
            'shadow-color': 'rgba(15, 23, 42, 0.15)',
            'shadow-opacity': 0.5,
            'shadow-offset-x': 0,
            'shadow-offset-y': 4,
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
            'font-family': 'Inter, "Helvetica Neue", Arial, sans-serif',
            'font-weight': 400,
            'text-rotation': 'autorotate',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
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

    const renderer = cyInstance.renderer()

    const projectPoint = (modelPoint) => {
      if (!modelPoint) {
        return { x: 0, y: 0 }
      }

      if (renderer && typeof renderer.projectIntoViewport === 'function') {
        const [projectedX, projectedY] = renderer.projectIntoViewport(modelPoint.x, modelPoint.y)
        return { x: projectedX, y: projectedY }
      }

      return { x: modelPoint.x, y: modelPoint.y }
    }

    cyInstance.on('mouseover', 'node', (event) => {
      const node = event.target
      const renderedPoint = event.renderedPosition || projectPoint(node.position())
      const properties = node.data('properties') ?? {}
      const propertyEntries = Object.entries(properties)
        .filter(([key]) => key !== 'id' && key !== 'label')
        .slice(0, 8)
        .map(([key, value]) => ({ key, value: formatTooltipValue(value) }))

      showTooltip({
        kind: 'node',
        title: node.data('label') || node.id(),
        subtitle: node.data('type'),
        color: getNodeColor(node.data('type')),
        position: computeTooltipPosition(renderedPoint, { x: 20, y: 20 }),
        entries: [{ key: 'ID', value: node.id() }, ...propertyEntries],
      })
    })

    cyInstance.on('mouseout', 'node', () => hideTooltip())

    cyInstance.on('mouseover', 'edge', (event) => {
      const edge = event.target
      const midpointModel =
        typeof edge.midpoint === 'function'
          ? edge.midpoint()
          : {
              x: (edge.source().position().x + edge.target().position().x) / 2,
              y: (edge.source().position().y + edge.target().position().y) / 2,
            }
      const renderedPoint = projectPoint(midpointModel)
      const properties = edge.data('properties') ?? {}
      const propertyEntries = Object.entries(properties)
        .filter(([key]) => key !== 'source' && key !== 'target')
        .slice(0, 8)
        .map(([key, value]) => ({ key, value: formatTooltipValue(value) }))

      showTooltip({
        kind: 'edge',
        title: edge.data('label') || edge.data('type') || 'Relationship',
        subtitle: edge.data('type'),
        color: getEdgeColor(edge.data('type')),
        position: computeTooltipPosition(renderedPoint, { x: 14, y: 14 }),
        entries: [
          { key: 'Source', value: edge.data('source') },
          { key: 'Target', value: edge.data('target') },
          ...propertyEntries,
        ],
      })
    })

    cyInstance.on('mouseout', 'edge', () => hideTooltip())

    cyInstance.on('tap', 'node', (event) => {
      hideTooltip(true)
      const node = event.target
      const nodeData = normalizedNodes.find((n) => n.id === node.id())
      if (nodeData) {
        setSelectedNode(nodeData)
      }
    })

    cyInstance.on('tap', 'edge', () => hideTooltip(true))

    cyInstance.on('tap', (event) => {
      if (event.target === cyInstance) {
        hideTooltip(true)
        setSelectedNode(null)
        cyInstance?.elements().removeClass('highlighted dimmed')
      }
    })

    cyInstance.on('pan zoom', () => hideTooltip(true))
    cyInstance.on('drag', 'node', () => hideTooltip(true))

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
    getNodeFillColor,
    getNodeTextColor,
    getNodeBorderColor,
    showTooltip,
    hideTooltip,
    computeTooltipPosition,
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
      setFilterNodeType('all')
      setSearchTerm('')
      setSearchMeta(null)
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

    const lowerTerm = term.toLowerCase()
    const matching = cyRef.current.nodes().filter(node => {
      const rawLabel = node.data('label')
      const label = typeof rawLabel === 'string' ? rawLabel.toLowerCase() : ''
      return label.includes(lowerTerm)
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
      setSearchMeta(null)
      toast.success('Default schema installed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to install default schema')
    } finally {
      setInstallingSchema(false)
    }
  }

  const handleResetSchema = async () => {
    setResettingSchema(true)
    try {
      const payload = await apiService.resetGraphSchema()
      setSchema(payload)
      setGraphData(null)
      setSearchMeta(null)
      setFilterNodeType('all')
      setSearchTerm('')
      toast.success('Graph schema reset and reinstalled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset graph schema')
    } finally {
      setResettingSchema(false)
    }
  }

  const handleRemoteSearch = async () => {
    const trimmed = remoteQuery.trim()
    if (!trimmed) {
      toast.error('Enter a search query to continue')
      return
    }

    setSearching(true)
    setFilterNodeType('all')
    setSearchTerm('')
  setSearchMeta(null)

    try {
      const response = await apiService.searchGraph({
        query: trimmed,
        mode: searchMode,
        limit: 120,
        includeRelated: true,
      })
      setGraphData(response)
      setSearchMeta(response)
      const nodeCount = response?.node_count ?? response?.nodes?.length ?? 0
      toast.success(`Search returned ${nodeCount} nodes`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleRemoteSearchSubmit = (event) => {
    event.preventDefault()
    if (!searching) {
      handleRemoteSearch()
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

  const remoteSearchPlaceholder = useMemo(() => {
    if (searchMode === 'orchestration') {
      return 'Orchestration run ID (e.g., orch-123456)'
    }
    if (searchMode === 'graphrag') {
      return 'Ask a natural language question about the graph'
    }
    if (searchMode === 'keyword') {
      return 'Search by node name, id, or description'
    }
    return 'Search graph (auto mode)'
  }, [searchMode])

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
          <Button
            variant="outline"
            onClick={handleResetSchema}
            disabled={loading || installingSchema || resettingSchema}
          >
            {resettingSchema ? 'Resetting...' : 'Reset Schema'}
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

            <Select value={nodeLabelMode} onValueChange={setNodeLabelMode}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Node label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Show Name</SelectItem>
                <SelectItem value="type">Show Type</SelectItem>
                <SelectItem value="id">Show ID</SelectItem>
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

        <form
          className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={handleRemoteSearchSubmit}
        >
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder={remoteSearchPlaceholder}
              value={remoteQuery}
              onChange={(event) => setRemoteQuery(event.target.value)}
              className="flex-1"
            />
            <Select value={searchMode} onValueChange={setSearchMode}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Search mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keyword</SelectItem>
                <SelectItem value="orchestration">Orchestration Run</SelectItem>
                <SelectItem value="graphrag">GraphRAG</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={searching} className="min-w-[140px]">
              {searching ? 'Searching...' : 'Run Search'}
            </Button>
          </div>
        </form>

        {searchMeta?.summary && (
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/40 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{searchMeta.summary}</p>
              {(typeof searchMeta.node_count === 'number' || typeof searchMeta.edge_count === 'number') && (
                <span className="text-xs text-muted-foreground">
                  {(searchMeta.node_count ?? 0).toLocaleString()} nodes • {(searchMeta.edge_count ?? 0).toLocaleString()} edges
                </span>
              )}
            </div>
            {Array.isArray(searchMeta.data_sources) && searchMeta.data_sources.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sources: {searchMeta.data_sources.join(', ')}
              </p>
            )}
            {Array.isArray(searchMeta.highlights) && searchMeta.highlights.length > 0 && (
              <div className="mt-3 text-sm">
                <p className="font-semibold">Highlights</p>
                <ul className="mt-1 space-y-2">
                  {searchMeta.highlights.slice(0, 3).map((item) => {
                    const match = Array.isArray(item?.properties?.matches)
                      ? item.properties.matches[0]
                      : null
                    const status = item?.properties?.status
                    const totalDuration = item?.properties?.totalDuration
                    return (
                      <li
                        key={`${item.id}-${item.type || 'node'}`}
                        className="rounded-md bg-background/70 px-3 py-2 text-xs shadow-sm dark:bg-slate-900/60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {item.name || item.id}
                          </span>
                          {typeof item.relevance === 'number' && (
                            <span className="text-[10px] uppercase text-muted-foreground">
                              Relevance {Math.round(item.relevance * 100)}%
                            </span>
                          )}
                        </div>
                        {match && (
                          <p className="mt-1 text-muted-foreground">
                            {match.field}: {match.value}
                          </p>
                        )}
                        {!match && (status || totalDuration) && (
                          <p className="mt-1 text-muted-foreground">
                            {status ? `Status: ${status}` : ''}
                            {typeof totalDuration === 'number'
                              ? `${status ? ' • ' : ''}Duration ${(totalDuration / 1000).toFixed(2)}s`
                              : ''}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {Array.isArray(searchMeta.graphrag_chunks) && searchMeta.graphrag_chunks.length > 0 && (
              <div className="mt-4 text-sm">
                <p className="font-semibold">Knowledge Chunks</p>
                <ul className="mt-1 space-y-2">
                  {searchMeta.graphrag_chunks.slice(0, 2).map((chunk) => {
                    const content = typeof chunk.content === 'string' ? chunk.content : ''
                    const preview = content.slice(0, 220)
                    const suffix = content.length > 220 ? '...' : ''
                    return (
                      <li
                        key={chunk.chunk_id}
                        className="rounded-md border border-border/40 bg-background/80 p-3 text-xs shadow-sm dark:bg-slate-900/40"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {chunk.source_description || chunk.source_type || 'Knowledge Chunk'}
                          </span>
                          {typeof chunk.score === 'number' && (
                            <span className="text-[10px] uppercase text-muted-foreground">
                              Score {chunk.score.toFixed(3)}
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed text-muted-foreground">
                          {preview}
                          {suffix}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

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
            <div className="relative">
              <div 
                ref={containerRef}
                className="w-full h-[620px] rounded-xl border border-border/60 bg-[#f5f7fb] dark:bg-[#0f172a] shadow-inner transition-colors"
              />

              <div className="pointer-events-none absolute inset-0 z-20">
                {tooltip && tooltip.position ? (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: 0,
                      top: 0,
                      transform: `translate(${tooltip.position.x}px, ${tooltip.position.y}px)`,
                    }}
                  >
                    <div className="pointer-events-auto min-w-[220px] max-w-[320px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
                      <div
                        className="px-4 py-3"
                        style={{
                          background: `linear-gradient(135deg, ${tooltip.color}, ${mixHexColors(
                            tooltip.color,
                            '#0f172a',
                            0.65,
                          )})`,
                        }}
                      >
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                          {tooltip.kind === 'edge' ? 'Relationship' : 'Node'}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-white">
                          {tooltip.title}
                        </p>
                        {tooltip.subtitle && (
                          <p className="text-xs text-white/80">{tooltip.subtitle}</p>
                        )}
                      </div>
                      <div className="space-y-2 px-4 py-3 text-xs text-slate-600 dark:text-slate-200">
                        {tooltip.entries?.length ? (
                          tooltip.entries.map((entry) => (
                            <div
                              key={`${tooltip.kind}-${tooltip.title}-${entry.key}`}
                              className="flex items-start justify-between gap-3"
                            >
                              <span className="font-medium text-slate-500 dark:text-slate-300">
                                {entry.key}
                              </span>
                              <span className="max-w-[180px] break-words text-right font-semibold text-slate-700 dark:text-slate-100">
                                {entry.value}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500 dark:text-slate-300">No additional metadata</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="pointer-events-none absolute top-4 right-4 z-30 flex flex-col items-end gap-3">
                <div className="pointer-events-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/85 text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/85 dark:text-slate-100"
                    onClick={() => setLegendOpen((prev) => !prev)}
                  >
                    <ListBullets size={16} className="mr-2" />
                    {legendOpen ? 'Hide Legend' : 'Show Legend'}
                  </Button>
                </div>

                {legendOpen && (
                  <div className="pointer-events-auto w-72 max-h-[520px] overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-lg dark:border-slate-700 dark:bg-slate-950/90">
                    <div className="flex items-center justify-between border-b border-white/50 px-4 py-3 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                        <Info size={16} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em]">Legend</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setLegendTab('nodes')}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            legendTab === 'nodes'
                              ? 'bg-slate-900 text-white dark:bg-white/95 dark:text-slate-900'
                              : 'bg-white/70 text-slate-600 hover:bg-white/85 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900/85'
                          }`}
                        >
                          Nodes
                        </button>
                        <button
                          type="button"
                          onClick={() => setLegendTab('relationships')}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            legendTab === 'relationships'
                              ? 'bg-slate-900 text-white dark:bg-white/95 dark:text-slate-900'
                              : 'bg-white/70 text-slate-600 hover:bg-white/85 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900/85'
                          }`}
                        >
                          Relationships
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[440px] overflow-y-auto px-4 py-3 text-sm">
                      {legendTab === 'nodes' ? (
                        legendTypes.length ? (
                          <div className="space-y-3">
                            {legendTypes.map((type) => {
                              const isObserved = observedTypes.includes(type)
                              return (
                                <div
                                  key={`legend-node-${type}`}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-5 w-5 rounded-md border shadow-sm"
                                      style={{
                                        backgroundColor: getNodeFillColor(type),
                                        borderColor: getNodeBorderColor(type),
                                      }}
                                    />
                                    <div className="flex flex-col leading-tight">
                                      <span className="font-semibold text-slate-700 dark:text-slate-100">{type}</span>
                                      <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-400">{getNodeShape(type)}</span>
                                    </div>
                                  </div>
                                  <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                                    isObserved
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                                      : 'bg-slate-900/10 text-slate-500 dark:bg-white/10 dark:text-slate-200'
                                  }`}>
                                    {isObserved ? 'Detected' : 'Schema'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-300">No node types detected yet.</p>
                        )
                      ) : relationshipLegendTypes.length ? (
                        <div className="space-y-3">
                          {relationshipLegendTypes.map((type) => {
                            const config = edgeStyleMap.lookup[type] || {}
                            const label = config.label || type
                            const sources = config.sources?.length ? config.sources : ['Any']
                            const targets = config.targets?.length ? config.targets : ['Any']
                            const color = getEdgeColor(type)
                            const style = getEdgeStyle(type)
                            const isObserved = observedRelationshipTypes.includes(type)
                            return (
                              <div
                                key={`legend-edge-${type}`}
                                className="space-y-2 rounded-lg border border-slate-200/70 bg-white/85 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{label}</span>
                                  <Badge
                                    variant="outline"
                                    className={`border-slate-200 text-[10px] uppercase tracking-wide dark:border-slate-700 dark:text-slate-200 ${
                                      isObserved
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                                        : 'bg-white/60 text-slate-500 dark:bg-slate-900/60 dark:text-slate-200'
                                    }`}
                                  >
                                    {type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: color, opacity: 0.92 }} />
                                  <span className="text-[11px] capitalize text-slate-500 dark:text-slate-300">{style}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300">
                                  <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">From</span>
                                  {sources.map((source) => (
                                    <Badge
                                      key={`legend-edge-${type}-source-${source}`}
                                      variant="outline"
                                      className="border-slate-200 bg-white/70 text-[10px] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                                    >
                                      {source}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300">
                                  <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">To</span>
                                  {targets.map((target) => (
                                    <Badge
                                      key={`legend-edge-${type}-target-${target}`}
                                      variant="outline"
                                      className="border-slate-200 bg-white/70 text-[10px] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                                    >
                                      {target}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-300">No relationship styles defined yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
