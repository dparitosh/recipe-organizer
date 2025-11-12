import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Warning, XCircle, CircleNotch } from '@phosphor-icons/react'
import { orchestrationService } from '@/lib/services/orchestration-service'

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

  const fetchNeo4jGraph = useCallback(async () => {
    if (!result?.id || !persistSummary?.runId) {
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
    if (!persistSummary?.runId || !result?.id) {
      setNeo4jGraph(null)
      setNeo4jError(null)
      setLoadingNeo4j(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoadingNeo4j(true)
      try {
        const data = await orchestrationService.fetchRunGraph(result.id)
        if (!cancelled) {
          setNeo4jGraph(data)
        }
      } catch (error) {
        if (!cancelled) {
          setNeo4jError(error instanceof Error ? error.message : 'Failed to fetch Neo4j graph data')
          setNeo4jGraph(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingNeo4j(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [persistSummary?.runId, result?.id])

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
                {result.recipe.ingredients.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">{ing.name}</TableCell>
                    <TableCell className="font-mono text-xs">{graphNodeIdForIngredient(ing)}</TableCell>
                    <TableCell>{typeof ing.percentage === 'number' ? ing.percentage.toFixed(2) : ing.percentage}%</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ing.function}</Badge>
                    </TableCell>
                    <TableCell>{ing.category || '—'}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell>{result.recipe.totalPercentage.toFixed(2)}%</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="calculation" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Cost</CardDescription>
                  <CardTitle className="text-2xl">
                    ${(result.calculation?.costs?.total ?? 0).toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Cost per Unit</CardDescription>
                  <CardTitle className="text-2xl">
                    ${(result.calculation?.costs?.perUnit ?? 0).toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Yield</CardDescription>
                  <CardTitle className="text-2xl">
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
                      <CardTitle className="text-xl">
                        ${Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.calculation.scaledIngredients.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">{ing.name}</TableCell>
                    <TableCell>
                      {typeof ing.scaledQuantity === 'number' ? ing.scaledQuantity.toFixed(2) : ing.scaledQuantity}
                    </TableCell>
                    <TableCell>{ing.scaledUnit}</TableCell>
                    <TableCell>${Number(ing.cost || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="graph" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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

            {persistSummary ? (
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
            ) : (
              <Alert>
                <AlertDescription>
                  Graph data was not persisted to Neo4j for this run. Ensure the pipeline completes successfully to enable Neo4j loading.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="font-semibold mb-2">Cypher Commands</h3>
              <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto font-mono text-xs">
                {result.graph.cypherCommands.map((cmd, idx) => (
                  <div key={idx} className="mb-1">{cmd}</div>
                ))}
              </div>
            </div>

            {persistSummary?.runId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Neo4j Snapshot</h3>
                  <Button variant="outline" size="sm" onClick={fetchNeo4jGraph} disabled={loadingNeo4j}>
                    {loadingNeo4j ? (
                      <>
                        <CircleNotch className="mr-2 h-4 w-4 animate-spin" /> Refreshing
                      </>
                    ) : (
                      'Refresh from Neo4j'
                    )}
                  </Button>
                </div>

                {neo4jError && (
                  <Alert variant="destructive">
                    <AlertDescription>{neo4jError}</AlertDescription>
                  </Alert>
                )}

                {loadingNeo4j && !neo4jGraph && (
                  <div className="text-sm text-muted-foreground">Loading persisted graph data…</div>
                )}

                {neo4jGraph && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Nodes ({neo4jGraph.node_count})</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Node ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Labels</TableHead>
                            <TableHead>Key Properties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(neo4jGraph.nodes ?? []).map((node) => (
                            <TableRow key={node.id}>
                              <TableCell className="font-mono text-xs">{node.id}</TableCell>
                              <TableCell>{node.type || node.properties?.type || '—'}</TableCell>
                              <TableCell>{(node.labels || []).join(', ') || '—'}</TableCell>
                              <TableCell>
                                <pre className="whitespace-pre-wrap text-xs">
                                  {JSON.stringify(node.properties ?? {}, null, 2)}
                                </pre>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Relationships ({neo4jGraph.edge_count})</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Edge ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Source → Target</TableHead>
                            <TableHead>Properties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(neo4jGraph.edges ?? []).map((edge) => (
                            <TableRow key={edge.id}>
                              <TableCell className="font-mono text-xs">{edge.id}</TableCell>
                              <TableCell>{edge.type}</TableCell>
                              <TableCell className="font-mono text-xs">{edge.source} → {edge.target}</TableCell>
                              <TableCell>
                                <pre className="whitespace-pre-wrap text-xs">
                                  {JSON.stringify(edge.properties ?? {}, null, 2)}
                                </pre>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
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
                  <CardTitle className="text-2xl">
                    {result.validation.summary.score}/100
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Checks Passed</CardDescription>
                  <CardTitle className="text-2xl">
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
            <div>
              <h3 className="font-semibold mb-2">Layout Configuration</h3>
              <div className="p-4 border rounded">
                <Badge>{result.uiConfig.layout}</Badge>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Components ({result.uiConfig.components.length})</h3>
              <div className="space-y-2">
                {result.uiConfig.components.map((comp, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{comp.title}</div>
                        <Badge variant="outline" className="text-xs mt-1">{comp.type}</Badge>
                      </div>
                      {comp.config?.chartType && (
                        <Badge>{comp.config.chartType}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
