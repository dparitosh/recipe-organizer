import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { Flask, Graph, Calculator, Database, Plus } from '@phosphor-icons/react'
import { FormulationEditor } from '@/components/formulation/FormulationEditor'
import { CalculationPanel } from '@/components/formulation/CalculationPanel'
import { FormulationGraph } from '@/components/graph/FormulationGraph'
import { IntegrationPanel } from '@/components/integrations/IntegrationPanel'
import { Formulation, createEmptyFormulation } from '@/lib/schemas/formulation'
import { neo4jClient } from '@/lib/api/neo4j'
import { toast } from 'sonner'

function App() {
  const [formulations, setFormulations] = useKV<Formulation[]>('formulations', [])
  const [activeFormulationId, setActiveFormulationId] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<any>(null)
  const [graphLayout, setGraphLayout] = useState<'hierarchical' | 'force' | 'circular'>('hierarchical')

  const activeFormulation = (formulations || []).find(f => f.id === activeFormulationId) || null

  const handleCreateFormulation = async () => {
    const user = await (window as any).spark.user()
    const newFormulation = createEmptyFormulation(user.login)
    setFormulations(current => [...(current || []), newFormulation])
    setActiveFormulationId(newFormulation.id)
    toast.success('New formulation created')
  }

  const handleUpdateFormulation = (updated: Formulation) => {
    setFormulations(current =>
      (current || []).map(f => f.id === updated.id ? updated : f)
    )
  }

  const handleLoadGraphData = async () => {
    if (!activeFormulation) {
      toast.error('No active formulation')
      return
    }

    try {
      const result = await neo4jClient.getFormulationGraph(activeFormulation.id)
      setGraphData(result)
      toast.success('Graph data loaded')
    } catch (error) {
      toast.error('Failed to load graph data')
      console.error(error)
    }
  }

  const handleGenerateMockGraph = () => {
    if (!activeFormulation) {
      toast.error('No active formulation')
      return
    }

    const mockNodes = [
      {
        id: activeFormulation.id,
        labels: ['Formulation'],
        properties: {
          name: activeFormulation.name,
          version: activeFormulation.version,
          type: activeFormulation.type
        }
      },
      ...activeFormulation.ingredients.map((ing, idx) => ({
        id: ing.id,
        labels: ['Ingredient'],
        properties: {
          name: ing.name,
          quantity: ing.quantity,
          percentage: ing.percentage,
          function: ing.function
        }
      }))
    ]

    const mockRelationships = activeFormulation.ingredients.map((ing, idx) => ({
      id: `rel-${idx}`,
      type: 'CONTAINS',
      startNode: activeFormulation.id,
      endNode: ing.id,
      properties: {
        percentage: ing.percentage
      }
    }))

    setGraphData({
      nodes: mockNodes,
      relationships: mockRelationships,
      metadata: {
        executionTime: 10,
        recordCount: mockNodes.length
      }
    })

    toast.success('Graph generated from formulation')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-center" />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flask className="text-primary" size={32} weight="duotone" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Formulation Graph Studio</h1>
              <p className="text-sm text-muted-foreground">
                Enterprise F&B Formulation Management & BOM Configuration
              </p>
            </div>
          </div>
          <Button onClick={handleCreateFormulation} className="gap-2">
            <Plus size={18} />
            New Formulation
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6">
        {(formulations || []).length === 0 ? (
          <Card className="p-12 text-center">
            <Flask className="mx-auto mb-4 text-muted-foreground" size={64} weight="duotone" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to Formulation Graph Studio</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Create, manage, and visualize Food & Beverage formulations with integrated PLM, SAP MDG,
              and Neo4j graph relationships. Calculate yields, costs, and optimize your recipes.
            </p>
            <Button onClick={handleCreateFormulation} size="lg" className="gap-2">
              <Plus size={20} />
              Create Your First Formulation
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Formulations</h3>
                  <div className="flex-1 flex gap-2 overflow-x-auto">
                    {(formulations || []).map((f) => (
                      <Button
                        key={f.id}
                        size="sm"
                        variant={f.id === activeFormulationId ? 'default' : 'outline'}
                        onClick={() => setActiveFormulationId(f.id)}
                      >
                        {f.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              {activeFormulation && (
                <>
                  <FormulationEditor
                    formulation={activeFormulation}
                    onChange={handleUpdateFormulation}
                  />

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Graph size={24} />
                        <h3 className="font-semibold">Relationship Graph</h3>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateMockGraph}
                        >
                          Generate Graph
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleLoadGraphData}
                        >
                          <Database size={16} className="mr-1" />
                          Load from Neo4j
                        </Button>
                        <select
                          className="px-3 py-1 text-sm border rounded-md"
                          value={graphLayout}
                          onChange={(e) => setGraphLayout(e.target.value as any)}
                        >
                          <option value="hierarchical">Hierarchical</option>
                          <option value="force">Force-Directed</option>
                          <option value="circular">Circular</option>
                        </select>
                      </div>
                    </div>
                    <FormulationGraph
                      data={graphData}
                      layout={graphLayout}
                      height="500px"
                      onNodeSelect={(nodeId) => toast.info(`Selected: ${nodeId}`)}
                    />
                  </Card>
                </>
              )}
            </div>

            <div className="space-y-6">
              <Tabs defaultValue="calculations">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="calculations">
                    <Calculator size={16} className="mr-1" />
                    Calculations
                  </TabsTrigger>
                  <TabsTrigger value="integrations">
                    <Database size={16} className="mr-1" />
                    Integrations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="calculations">
                  {activeFormulation ? (
                    <CalculationPanel
                      formulation={activeFormulation}
                      onScaledFormulation={handleUpdateFormulation}
                    />
                  ) : (
                    <Card className="p-8 text-center">
                      <Calculator className="mx-auto mb-2 text-muted-foreground" size={48} />
                      <p className="text-muted-foreground">Select a formulation to calculate</p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="integrations">
                  <IntegrationPanel />
                </TabsContent>
              </Tabs>

              <Card className="p-6 bg-secondary/20">
                <h3 className="font-semibold mb-3 text-sm">System Status</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neo4j:</span>
                    <span className="text-green-500 font-semibold">Connected (Mock)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PLM:</span>
                    <span className="text-green-500 font-semibold">Connected (Mock)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SAP MDG:</span>
                    <span className="text-green-500 font-semibold">Connected (Mock)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FDC API:</span>
                    <span className="text-green-500 font-semibold">Available</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-card/30 py-4">
        <div className="px-6 text-center text-sm text-muted-foreground">
          Formulation Graph Studio • Enterprise F&B Management Platform
        </div>
      </footer>
    </div>
  )
}

export default App
