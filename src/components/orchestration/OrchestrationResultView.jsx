import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Warning, XCircle, CircleNotch } from '@phosphor-icons/react'
import { orchestrationService } from '@/lib/services/orchestration-service'
import { GraphSnapshotViewer } from './GraphSnapshotViewer'
import { UIMetricsDashboard } from './UIMetricsDashboard'

export function OrchestrationResultView({ result, persistSummary }) {
  const [neo4jGraph, setNeo4jGraph] = useState(null)
  const [loadingNeo4j, setLoadingNeo4j] = useState(false)
  const [neo4jError, setNeo4jError] = useState(null)

  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle size={24} weight="fill" className="text-green-500" />
      case 'partial':
        return <Warning size={24} weight="fill" className="text-yellow-500" />
      case 'failed':
        return <XCircle size={24} weight="fill" className="text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (result.status) {
      case 'success':
        return 'default'
      case 'partial':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const costBreakdown = useMemo(() => {
    const costs = result.calculation?.costs ?? {}
    return [
      { key: 'rawMaterials', label: 'Raw Materials', value: costs.rawMaterials },
      { key: 'labor', label: 'Labor', value: costs.labor },
      { key: 'overhead', label: 'Overhead', value: costs.overhead },
      { key: 'packaging', label: 'Packaging', value: costs.packaging },
      { key: 'total', label: 'Total', value: costs.total },
      { key: 'perUnit', label: 'Per Unit', value: costs.perUnit },
    ].filter((item) => typeof item.value === 'number')
  }, [result.calculation?.costs])

  const validationSummary = useMemo(() => {
    const summary = result.validation?.summary
    const errors = result.validation?.errors ?? []
    if (result.validation?.valid) {
      return `All QA checks passed. Score ${summary?.score ?? 100}/100 with ${summary?.passed ?? 0} of ${summary?.totalChecks ?? 0} checks satisfied.`
    }

    if (errors.length > 0) {
      const critical = errors.find((error) => error.severity === 'error') ?? errors[0]
      return `QA flagged ${errors.length} issue${errors.length > 1 ? 's' : ''}. Most severe: ${critical.agent} – ${critical.message}`
    }

    return 'Validation encountered issues but no explicit errors were returned.'
  }, [result.validation])

  const graphNodeIdForIngredient = useCallback((ingredient) => {
    if (!ingredient) return ''
    return `ingredient-${ingredient.id || ingredient.name || 'unknown'}`
  }, [])

  const fetchNeo4jGraph = useCallback(async (force = false) => {
    if (!result?.id || !persistSummary?.runId) {
      setNeo4jGraph(null)
      setNeo4jError(null)
      setLoadingNeo4j(false)
      return
    }

    setLoadingNeo4j(true)
    setNeo4jError(null)

    try {
      const data = await orchestrationService.fetchRunGraph(result.id)
      setNeo4jGraph(data)
    } catch (error) {
      setNeo4jError(error instanceof Error ? error.message : 'Failed to fetch Neo4j graph data')
      setNeo4jGraph(null)
    } finally {
      setLoadingNeo4j(false)
    }
  }, [persistSummary?.runId, result?.id])

  useEffect(() => {
    let cancelled = false

    if (!persistSummary?.runId || !result?.id) {
      setNeo4jGraph(null)
      setNeo4jError(null)
      setLoadingNeo4j(false)
      return
    }

    const load = async () => {
      if (cancelled) return
      await fetchNeo4jGraph()
    }

    load()

    return () => {
      cancelled = true
    }
  }, [persistSummary?.runId, result?.id, fetchNeo4jGraph])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle>Orchestration Results</CardTitle>
              <CardDescription>
                Completed in {(result.totalDuration / 1000).toFixed(2)}s
              </CardDescription>
            </div>
          </div>
          <Badge variant={getStatusColor()}>{result.status.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recipe" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="recipe">Recipe</TabsTrigger>
            <TabsTrigger value="calculation">Calculation</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="ui">UI Config</TabsTrigger>
          </TabsList>

          <TabsContent value="recipe" className="space-y-4">
            <div className="space-y-2">
              <div className="text-lg font-semibold">{result.recipe.name}</div>
              {result.recipe.description && (
                <div className="text-sm text-muted-foreground">{result.recipe.description}</div>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Graph Node</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.recipe.ingredients.length > 0 ? (
                  result.recipe.ingredients.map((ing) => (
                    <TableRow key={ing.id}>
                      <TableCell className="font-medium">{ing.name}</TableCell>
                      <TableCell className="font-mono text-xs">{graphNodeIdForIngredient(ing)}</TableCell>
                      <TableCell>{typeof ing.percentage === 'number' ? ing.percentage.toFixed(2) : ing.percentage}%</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ing.function}</Badge>
                      </TableCell>
                      <TableCell>{ing.category || '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No ingredients found. The recipe generation may have failed.
                    </TableCell>
                  </TableRow>
                )}
                {result.recipe.ingredients.length > 0 && (
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell>{result.recipe.totalPercentage.toFixed(2)}%</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="calculation" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Cost</CardDescription>
                  <CardTitle className="text-2xl" aria-label={`Total cost: ${(result.calculation?.costs?.total ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}>
                    {(result.calculation?.costs?.total ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Cost per Unit</CardDescription>
                  <CardTitle className="text-2xl" aria-label={`Cost per unit: ${(result.calculation?.costs?.perUnit ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                    {(result.calculation?.costs?.perUnit ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Yield</CardDescription>
                  <CardTitle className="text-2xl" aria-label={`Yield: ${result.calculation?.yield?.percentage ?? 0} percent`}>
                    {result.calculation?.yield?.percentage ?? 0}%
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {costBreakdown.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {costBreakdown.map((item) => (
                  <Card key={item.key}>
                    <CardHeader className="pb-3">
                      <CardDescription>{item.label}</CardDescription>
                      <CardTitle className="text-xl" aria-label={`${item.label}: ${Number(item.value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}>
                        {Number(item.value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Original %</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Density</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.calculation?.scaledIngredients?.length > 0 ? (
                  result.calculation.scaledIngredients.map((ing) => (
                    <TableRow key={ing.id}>
                      <TableCell className="font-medium">{ing.name}</TableCell>
                      <TableCell>{typeof ing.originalPercentage === 'number' ? ing.originalPercentage.toFixed(2) : ing.originalPercentage}%</TableCell>
                      <TableCell>
                        {typeof ing.scaledQuantity === 'number' ? ing.scaledQuantity.toFixed(2) : ing.scaledQuantity}
                      </TableCell>
                      <TableCell>{ing.scaledUnit}</TableCell>
                      <TableCell>{ing.volumeEquivalent != null ? (typeof ing.volumeEquivalent === 'number' ? ing.volumeEquivalent.toFixed(2) : ing.volumeEquivalent) : '—'}</TableCell>
                      <TableCell>{ing.cost != null ? Number(ing.cost).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—'}</TableCell>
                      <TableCell>{ing.density != null ? (typeof ing.density === 'number' ? ing.density.toFixed(3) : ing.density) : '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No scaled ingredients calculated. Check the calculation agent output for errors.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="graph" className="space-y-4">
            {/* Graph Snapshot Viewer */}
            <GraphSnapshotViewer graphSnapshot={result.graphSnapshot} />

            {/* Metadata Summary */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Nodes</CardDescription>
                  <CardTitle className="text-2xl">
                    {result.graph.metadata.nodeCount}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Edges</CardDescription>
                  <CardTitle className="text-2xl">
                    {result.graph.metadata.edgeCount}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Complexity</CardDescription>
                  <CardTitle className="text-2xl capitalize">
                    {result.graph.metadata.graphComplexity}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Persistence Summary */}
            {persistSummary && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Neo4j Nodes Created</CardDescription>
                    <CardTitle className="text-2xl">{persistSummary.nodesCreated}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Neo4j Relationships Created</CardDescription>
                    <CardTitle className="text-2xl">{persistSummary.relationshipsCreated}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Properties Updated</CardDescription>
                    <CardTitle className="text-2xl">{persistSummary.propertiesSet}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <Alert variant={result.validation?.valid ? 'default' : 'destructive'}>
              <AlertDescription>{validationSummary}</AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Validation Score</CardDescription>
                  <CardTitle className="text-2xl" aria-label={`Validation score: ${result.validation.summary.score} out of 100`}>
                    {result.validation.summary.score}/100
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Checks Passed</CardDescription>
                  <CardTitle className="text-2xl" aria-label={`Checks passed: ${result.validation.summary.passed} out of ${result.validation.summary.totalChecks}`}>
                    {result.validation.summary.passed}/{result.validation.summary.totalChecks}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {result.validation.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Errors & Warnings</h3>
                <div className="space-y-2">
                  {result.validation.errors.map((error, idx) => (
                    <Alert key={idx} variant={error.severity === 'error' ? 'destructive' : 'default'}>
                      <AlertDescription>
                        <span className="font-medium">{error.agent}</span> - {error.field}: {error.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Validation Checks</h3>
              <div className="space-y-2">
                {Object.entries(result.validation.checks).map(([key, passed]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {passed ? (
                      <CheckCircle size={20} weight="fill" className="text-green-500" />
                    ) : (
                      <XCircle size={20} weight="fill" className="text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ui" className="space-y-4">
            {/* UI Metrics Dashboard */}
            <UIMetricsDashboard uiMetrics={result.uiConfig} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
