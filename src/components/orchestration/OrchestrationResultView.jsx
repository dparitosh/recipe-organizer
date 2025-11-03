import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react'

export function OrchestrationResultView({ result }) {
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
                  <TableHead>Percentage</TableHead>
                  <TableHead>Function</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.recipe.ingredients.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">{ing.name}</TableCell>
                    <TableCell>{ing.percentage.toFixed(2)}%</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ing.function}</Badge>
                    </TableCell>
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
                    ${result.calculation.costs.total.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Cost per Unit</CardDescription>
                  <CardTitle className="text-2xl">
                    ${result.calculation.costs.perUnit.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Yield</CardDescription>
                  <CardTitle className="text-2xl">
                    {result.calculation.yield.percentage}%
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

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
                    <TableCell>{ing.scaledQuantity.toFixed(2)}</TableCell>
                    <TableCell>{ing.scaledUnit}</TableCell>
                    <TableCell>${(ing.cost || 0).toFixed(2)}</TableCell>
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

            <div>
              <h3 className="font-semibold mb-2">Cypher Commands</h3>
              <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto font-mono text-xs">
                {result.graph.cypherCommands.map((cmd, idx) => (
                  <div key={idx} className="mb-1">{cmd}</div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
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
