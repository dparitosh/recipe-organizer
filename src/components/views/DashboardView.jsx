import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight,
  ChartLine,
  CirclesThreePlus,
  ShareNetwork,
  GearSix,
  ClockClockwise,
  ShieldCheck,
  CloudArrowDown,
  ClipboardText,
} from '@phosphor-icons/react'
import { apiService } from '@/lib/api/service'
import { toast } from 'sonner'

const numberFormatter = new Intl.NumberFormat('en-US')
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

const STATUS_THEME = {
  healthy: {
    label: 'Healthy',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  error: {
    label: 'Attention',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  checking: {
    label: 'Checking',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  idle: {
    label: 'Not Configured',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

function statusBadge(status) {
  const theme = STATUS_THEME[status] ?? STATUS_THEME.checking
  return (
    <Badge variant="outline" className={`px-2 py-1 text-xs font-semibold border ${theme.className}`}>
      {theme.label}
    </Badge>
  )
}

function formatCount(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0'
  }
  return numberFormatter.format(value)
}

function formatTimestamp(value) {
  if (!value) return 'Not recorded'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return dateFormatter.format(parsed)
}

export function DashboardView({ backendUrl, onNavigate }) {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [serviceStatus, setServiceStatus] = useState({
    api: 'idle',
    neo4j: 'idle',
    schema: 'idle',
  })
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (!backendUrl) {
      setServiceStatus({ api: 'idle', neo4j: 'idle', schema: 'idle' })
      setMetrics(null)
      return
    }

    let isCancelled = false
    setLoading(true)
    setErrorMessage(null)

    apiService.setBaseUrl(backendUrl)

    const nextStatus = { api: 'checking', neo4j: 'checking', schema: 'checking' }

    const load = async () => {
      let primaryError = null
      let graphPayload = null
      let schemaPayload = null

      try {
        const health = await apiService.getHealth()
        nextStatus.api = health?.status === 'healthy' ? 'healthy' : 'error'
        if (nextStatus.api === 'error') {
          primaryError = new Error('Backend health check returned a non-healthy status')
        }
      } catch (error) {
        nextStatus.api = 'error'
        primaryError = error
      }

      try {
        graphPayload = await apiService.getGraph()
        nextStatus.neo4j = 'healthy'
      } catch (error) {
        nextStatus.neo4j = 'error'
        if (!primaryError) {
          primaryError = error
        }
      }

      try {
        schemaPayload = await apiService.getGraphSchema()
        nextStatus.schema = 'healthy'
      } catch (error) {
        nextStatus.schema = 'error'
        if (!primaryError) {
          primaryError = error
        }
      }

      if (isCancelled) {
        return
      }

      setServiceStatus(nextStatus)

      const nodes = Array.isArray(graphPayload?.nodes) ? graphPayload.nodes : []
      const edgesSource = graphPayload?.edges ?? graphPayload?.relationships ?? []
      const edges = Array.isArray(edgesSource) ? edgesSource : []
      const nodeCount = graphPayload?.node_count ?? nodes.length
      const edgeCount = graphPayload?.edge_count ?? edges.length

      const typeCounts = nodes.reduce((acc, node) => {
        const labels = Array.isArray(node.labels) ? node.labels : []
        const label = labels[0] || node.label || 'Unlabeled'
        acc[label] = (acc[label] || 0) + 1
        return acc
      }, {})

      const typeBreakdown = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({
          type,
          count,
          percentage: nodeCount > 0 ? Math.round((count / nodeCount) * 100) : 0,
        }))
        .slice(0, 5)

      const metricsPayload = {
        nodeCount,
        edgeCount,
        schemaVersion: schemaPayload?.version || 'Not versioned',
        schemaUpdatedAt: schemaPayload?.last_updated || schemaPayload?.lastUpdated || null,
        nodeTypes: schemaPayload?.node_types?.length ?? 0,
        relationshipTypes: schemaPayload?.relationship_types?.length ?? 0,
        typeBreakdown,
      }

      setMetrics(metricsPayload)
      setLoading(false)

      if (primaryError) {
        setErrorMessage(primaryError instanceof Error ? primaryError.message : String(primaryError))
      }
    }

    load()

    return () => {
      isCancelled = true
    }
  }, [backendUrl])

  const quickLinks = useMemo(
    () => [
      {
        label: 'Open Graph Explorer',
        description: 'Visualize live relationships and schema styling',
        icon: ShareNetwork,
        view: 'graph',
      },
      {
        label: 'Manage Formulations',
        description: 'Review product definitions and bill-of-materials',
        icon: ClipboardText,
        view: 'formulations',
      },
      {
        label: 'Ingest Data',
        description: 'Load master data from FDC, SAP MDG, or CSV files',
        icon: CloudArrowDown,
        view: 'ingest',
      },
      {
        label: 'Agent Orchestration',
        description: 'Run guided multi-agent formulation workflows',
        icon: GearSix,
        view: 'orchestration',
      },
    ],
    []
  )

  const insightTiles = useMemo(() => {
    if (!metrics) {
      return []
    }

    const highlights = []

    if (metrics.typeBreakdown.length > 0) {
      const dominant = metrics.typeBreakdown[0]
      highlights.push({
        title: `${dominant.type} nodes dominate`,
        subtitle: `${dominant.percentage}% of loaded graph entities`,
        Icon: ChartLine,
      })
    }

    highlights.push({
      title: 'Schema coverage',
      subtitle: `${metrics.nodeTypes} node types • ${metrics.relationshipTypes} relationship templates`,
      Icon: CirclesThreePlus,
    })

    highlights.push({
      title: 'Graph scale snapshot',
      subtitle: `${formatCount(metrics.nodeCount)} nodes • ${formatCount(metrics.edgeCount)} relationships`,
      Icon: ShareNetwork,
    })

    return highlights
  }, [metrics])

  const serviceRows = useMemo(
    () => [
      {
        key: 'api',
        label: 'Backend API',
        description: 'FastAPI service health status',
        status: serviceStatus.api,
      },
      {
        key: 'neo4j',
        label: 'Neo4j Graph',
        description: 'Query endpoint for graph data',
        status: serviceStatus.neo4j,
      },
      {
        key: 'schema',
        label: 'Schema Metadata',
        description: 'Graph schema management service',
        status: serviceStatus.schema,
      },
    ],
    [serviceStatus]
  )

  const handleNavigate = (view) => {
    if (typeof onNavigate === 'function') {
      onNavigate(view)
    } else {
      toast.info(`Navigation handler not available. Desired view: ${view}`)
    }
  }

  if (!backendUrl) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configure Backend Connection</CardTitle>
            <CardDescription>
              Provide a backend API URL in Settings to unlock dashboard insights and graph telemetry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleNavigate('settings')} className="gap-2">
              Go to Settings
              <ArrowRight size={16} weight="bold" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary uppercase tracking-wide">
            <ShieldCheck size={18} weight="bold" />
            Operations Dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Formulation Platform Overview</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Monitor graph readiness, system integrations, and formulation activity in a single executive snapshot.
          </p>
        </div>
        <Button variant="outline" onClick={() => handleNavigate('graph')} className="gap-2">
          View Graph Explorer
          <ArrowRight size={16} weight="bold" />
        </Button>
      </div>

      {errorMessage && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800">Attention</CardTitle>
            <CardDescription className="text-amber-700">
              {errorMessage}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">Nodes</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <CirclesThreePlus size={24} className="text-primary" />
              {metrics ? formatCount(metrics.nodeCount) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Loaded from Neo4j (sample capped at 100)
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">Relationships</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ShareNetwork size={24} className="text-primary" />
              {metrics ? formatCount(metrics.edgeCount) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Current relationship sample retrieved from API
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">Schema Version</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <GearSix size={24} className="text-primary" />
              {metrics?.schemaVersion || 'Unversioned'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {metrics ? `${metrics.nodeTypes} node types • ${metrics.relationshipTypes} relationship templates` : 'Schema metadata unavailable'}
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">Last Schema Update</CardDescription>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClockClockwise size={20} className="text-primary" />
              {metrics ? formatTimestamp(metrics.schemaUpdatedAt) : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Automatic refresh on schema installation or edits
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLine size={20} className="text-primary" />
              Graph Insights
            </CardTitle>
            <CardDescription>Composition snapshot derived from the active graph sample.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Collecting graph metrics...</p>}

            {!loading && metrics && metrics.typeBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">Load graph data to populate insight tiles.</p>
            )}

            {!loading && metrics && metrics.typeBreakdown.length > 0 && (
              <div className="space-y-3">
                {metrics.typeBreakdown.map((item) => (
                  <div key={item.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.type}</span>
                      <span className="text-muted-foreground">{formatCount(item.count)} • {item.percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insightTiles.map(({ title, subtitle, Icon }) => (
                <div key={title} className="rounded-lg border border-dashed border-border/60 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icon size={18} className="text-primary" />
                    {title}
                  </div>
                  <div className="text-xs text-muted-foreground">{subtitle}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              Service Health
            </CardTitle>
            <CardDescription>Integration checkpoints monitored during page load.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceRows.map((service) => (
              <div key={service.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{service.label}</p>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                  {statusBadge(service.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GearSix size={20} className="text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Jump into high-value workflows without leaving the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickLinks.map(({ label, description, icon: Icon, view }) => (
            <Button
              key={label}
              variant="outline"
              className="justify-start text-left h-auto py-3 px-4 gap-3"
              onClick={() => handleNavigate(view)}
            >
              <Icon size={20} className="text-primary" />
              <span>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
