import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Palette, SquareSplitHorizontal, Package } from '@phosphor-icons/react'
import { envService } from '@/lib/services/env-service'

// API and UI configuration
const API_CONFIG = {
  maxRunsToFetch: 50,
  autoSelectCount: 2,
}

const UI_CONFIG = {
  colorComparisonHeight: 300,
  componentComparisonHeight: 400,
  emptyIconSize: 32,
}

export function UIConfigComparison({ formulationId }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedRunA, setSelectedRunA] = useState(null)
  const [selectedRunB, setSelectedRunB] = useState(null)
  const [configA, setConfigA] = useState(null)
  const [configB, setConfigB] = useState(null)

  useEffect(() => {
    if (formulationId) {
      loadOrchestrationRuns()
    }
  }, [formulationId, loadOrchestrationRuns])

  const loadOrchestrationRuns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${envService.getBackendUrl()}/api/orchestration/runs?formulation_id=${formulationId}&limit=${API_CONFIG.maxRunsToFetch}`
      )

      if (!response.ok) {
        throw new Error('Failed to load orchestration runs')
      }

      const data = await response.json()
      const runsWithUI = data.runs.filter((run) => run.uiConfig || run.ui_config)
      setRuns(runsWithUI)

      // Auto-select latest runs if available
      if (runsWithUI.length >= API_CONFIG.autoSelectCount) {
        setSelectedRunA(runsWithUI[0].runId || runsWithUI[0].run_id)
        setSelectedRunB(runsWithUI[1].runId || runsWithUI[1].run_id)
      } else if (runsWithUI.length === 1) {
        setSelectedRunA(runsWithUI[0].runId || runsWithUI[0].run_id)
      }
    } catch (err) {
      console.error('Failed to load orchestration runs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [formulationId])

  const loadUIConfig = useCallback(async (runId, side) => {
    try {
      const response = await fetch(`${envService.getBackendUrl()}/api/orchestration/runs/${runId}`)

      if (!response.ok) {
        throw new Error(`Failed to load UI config for run ${runId}`)
      }

      const data = await response.json()
      const config = data.result?.uiConfig || data.result?.ui_config

      if (side === 'A') {
        setConfigA(config)
      } else {
        setConfigB(config)
      }
    } catch (err) {
      console.error(`Failed to load UI config for run ${runId}:`, err)
      if (side === 'A') {
        setConfigA(null)
      } else {
        setConfigB(null)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedRunA) {
      loadUIConfig(selectedRunA, 'A')
    } else {
      setConfigA(null)
    }
  }, [selectedRunA, loadUIConfig])

  useEffect(() => {
    if (selectedRunB) {
      loadUIConfig(selectedRunB, 'B')
    } else {
      setConfigB(null)
    }
  }, [selectedRunB, loadUIConfig])

  const handleExportJSON = () => {
    const comparison = {
      formulationId,
      comparison: {
        runA: {
          id: selectedRunA,
          config: configA,
        },
        runB: {
          id: selectedRunB,
          config: configB,
        },
      },
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(comparison, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ui-config-comparison-${formulationId}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getRunLabel = (runId) => {
    const run = runs.find((r) => (r.runId || r.run_id) === runId)
    if (!run) return runId

    const dateValue = run.timestamp || run.created_at
    const timestamp = dateValue ? new Date(dateValue).toLocaleString() : 'Unknown date'
    return `${run.status || 'Unknown'} - ${timestamp}`
  }

  const compareColors = (paletteA, paletteB) => {
    const allKeys = new Set([
      ...Object.keys(paletteA || {}),
      ...Object.keys(paletteB || {}),
    ])

    return Array.from(allKeys).map((key) => ({
      key,
      colorA: paletteA?.[key],
      colorB: paletteB?.[key],
      changed: paletteA?.[key] !== paletteB?.[key],
    }))
  }

  const compareComponents = (componentsA, componentsB) => {
    const aArray = Array.isArray(componentsA) ? componentsA : []
    const bArray = Array.isArray(componentsB) ? componentsB : []

    const maxLength = Math.max(aArray.length, bArray.length)
    const comparisons = []

    for (let i = 0; i < maxLength; i++) {
      comparisons.push({
        index: i,
        componentA: aArray[i],
        componentB: bArray[i],
      })
    }

    return comparisons
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Loading orchestration runs...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <SquareSplitHorizontal size={UI_CONFIG.emptyIconSize} className="opacity-50" />
            <p className="text-sm">No UI configs available for comparison</p>
            <p className="text-xs">Run orchestrations with UI Designer to generate configs</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Run Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Compare UI Configurations</CardTitle>
              <CardDescription>Select two orchestration runs to compare</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={!configA && !configB}
            >
              <Download size={16} className="mr-2" />
              Export JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Config A</label>
              <Select value={selectedRunA || ''} onValueChange={setSelectedRunA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select run A" />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run) => (
                    <SelectItem key={run.runId || run.run_id} value={run.runId || run.run_id}>
                      {getRunLabel(run.runId || run.run_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Config B</label>
              <Select value={selectedRunB || ''} onValueChange={setSelectedRunB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select run B" />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run) => (
                    <SelectItem key={run.runId || run.run_id} value={run.runId || run.run_id}>
                      {getRunLabel(run.runId || run.run_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Comparison */}
      {(configA?.layout || configB?.layout) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <SquareSplitHorizontal size={16} />
              Layout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Config A</p>
                {configA?.layout ? (
                  <Badge variant={configA.layout !== configB?.layout ? 'default' : 'secondary'}>
                    {typeof configA.layout === 'string' ? configA.layout : configA.layout.type || 'N/A'}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">No layout</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Config B</p>
                {configB?.layout ? (
                  <Badge variant={configA?.layout !== configB.layout ? 'default' : 'secondary'}>
                    {typeof configB.layout === 'string' ? configB.layout : configB.layout.type || 'N/A'}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">No layout</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theme Comparison */}
      {(configA?.theme?.palette || configB?.theme?.palette) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette size={16} />
              Theme Colors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className={`h-[${UI_CONFIG.colorComparisonHeight}px]`}>
              <div className="space-y-3">
                {compareColors(configA?.theme?.palette, configB?.theme?.palette).map((comparison) => (
                  <div
                    key={comparison.key}
                    className={`grid grid-cols-2 gap-4 p-3 rounded ${
                      comparison.changed ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-muted'
                    }`}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{comparison.key}</p>
                      {comparison.colorA ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: comparison.colorA }}
                          />
                          <code className="text-xs">{comparison.colorA}</code>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not set</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{comparison.key}</p>
                      {comparison.colorB ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: comparison.colorB }}
                          />
                          <code className="text-xs">{comparison.colorB}</code>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not set</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Components Comparison */}
      {(configA?.components || configB?.components) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package size={16} />
              Components
            </CardTitle>
            <CardDescription>
              Config A: {Array.isArray(configA?.components) ? configA.components.length : 0} components,
              Config B: {Array.isArray(configB?.components) ? configB.components.length : 0} components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className={`h-[${UI_CONFIG.componentComparisonHeight}px]`}>
              <div className="space-y-3">
                {compareComponents(configA?.components, configB?.components).map((comparison) => (
                  <div
                    key={comparison.index}
                    className={`grid grid-cols-2 gap-4 p-3 rounded ${
                      JSON.stringify(comparison.componentA) !== JSON.stringify(comparison.componentB)
                        ? 'bg-yellow-50 dark:bg-yellow-950'
                        : 'bg-muted'
                    }`}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Component {comparison.index + 1}</p>
                      {comparison.componentA ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {comparison.componentA.title || 'Untitled'}
                          </p>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {comparison.componentA.type || 'unknown'}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not present</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Component {comparison.index + 1}</p>
                      {comparison.componentB ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {comparison.componentB.title || 'Untitled'}
                          </p>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {comparison.componentB.type || 'unknown'}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not present</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
