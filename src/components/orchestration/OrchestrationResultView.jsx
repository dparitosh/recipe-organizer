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
            <div>
              <h3 className="font-semibold mb-2">Layout Configuration</h3>
              <div className="p-4 border rounded">
                <Badge>{result.uiConfig?.layout || 'not-specified'}</Badge>
              </div>
            </div>

            {result.uiConfig?.theme && (
              <div>
                <h3 className="font-semibold mb-2">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  {result.uiConfig.theme.primaryColor && (
                    <div className="p-3 border rounded">
                      <div className="text-xs text-muted-foreground mb-1">Primary Color</div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: result.uiConfig.theme.primaryColor }}></div>
                        <code className="text-xs">{result.uiConfig.theme.primaryColor}</code>
                      </div>
                    </div>
                  )}
                  {result.uiConfig.theme.accentColor && (
                    <div className="p-3 border rounded">
                      <div className="text-xs text-muted-foreground mb-1">Accent Color</div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: result.uiConfig.theme.accentColor }}></div>
                        <code className="text-xs">{result.uiConfig.theme.accentColor}</code>
                      </div>
                    </div>
                  )}
                  {result.uiConfig.theme.spacing && (
                    <div className="p-3 border rounded">
                      <div className="text-xs text-muted-foreground mb-1">Spacing</div>
                      <Badge variant="outline">{result.uiConfig.theme.spacing}</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Components ({result.uiConfig?.components?.length ?? 0})</h3>
              <div className="space-y-2">
                {result.uiConfig?.components?.length > 0 ? (
                  result.uiConfig.components.map((comp, idx) => (
                    <div key={idx} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{comp.title || 'Untitled Component'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{comp.type || 'unknown'}</Badge>
                            {comp.config?.chartType && (
                              <Badge variant="secondary" className="text-xs">{comp.config.chartType}</Badge>
                            )}
                          </div>
                        </div>
                        {comp.position && (
                          <div className="text-xs text-muted-foreground">
                            Row {comp.position.row}, Col {comp.position.col}
                            {comp.position.span && `, Span ${comp.position.span}`}
                          </div>
                        )}
                      </div>
                      {comp.config?.columns && comp.config.columns.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground mb-1">Table Columns:</div>
                          <div className="flex flex-wrap gap-1">
                            {comp.config.columns.map((col, colIdx) => (
                              <Badge key={colIdx} variant="outline" className="text-[10px]">
                                {col.label} ({col.key})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {comp.config?.colorScheme && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground">Color Scheme: <code className="text-xs">{comp.config.colorScheme}</code></div>
                        </div>
                      )}
                      {comp.config?.showLegend !== undefined && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-muted-foreground">Show Legend: {comp.config.showLegend ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8 border rounded">
                    No UI components generated. The UI Designer agent may have failed or returned empty configuration.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
