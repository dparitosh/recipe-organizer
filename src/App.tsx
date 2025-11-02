import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Flask, Graph, Calculator, Database, Plus, Cube, GitBranch, Gear } from '@phosphor-icons/react'
import { FormulationEditor } from '@/components/formulation/FormulationEditor'
import { CalculationPanel } from '@/components/formulation/CalculationPanel'
import { FormulationGraph } from '@/components/graph/FormulationGraph'
import { RelationshipGraphViewer } from '@/components/graph/RelationshipGraphViewer'
import { IntegrationPanel } from '@/components/integrations/IntegrationPanel'
import { BOMConfigurator } from '@/components/bom/BOMConfigurator'
import { Neo4jSettings } from '@/components/Neo4jSettings'
import { Formulation, createEmptyFormulation } from '@/lib/schemas/formulation'
import { BOM, createEmptyBOM } from '@/lib/schemas/bom'
import { neo4jClient } from '@/lib/api/neo4j'
import { createMockNeo4jAPI } from '@/lib/api/neo4j-api'
import { toast } from 'sonner'

function App() {
  const [formulations, setFormulations] = useKV<Formulation[]>('formulations', [])
  const [boms, setBOMs] = useKV<BOM[]>('boms', [])
  const [activeFormulationId, setActiveFormulationId] = useState<string | null>(null)
  const [activeBOMId, setActiveBOMId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'formulation' | 'bom' | 'relationships'>('formulation')
  const [graphData, setGraphData] = useState<any>(null)
  const [relationshipGraphData, setRelationshipGraphData] = useState<any>(null)
  const [graphLayout, setGraphLayout] = useState<'hierarchical' | 'force' | 'circular'>('hierarchical')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const mockAPI = createMockNeo4jAPI()
    return () => mockAPI.restore()
  }, [])

  const activeFormulation = (formulations || []).find(f => f.id === activeFormulationId) || null
  const activeBOM = (boms || []).find(b => b.id === activeBOMId) || null

  const handleCreateFormulation = async () => {
    const user = await (window as any).spark.user()
    const newFormulation = createEmptyFormulation(user.login)
    setFormulations(current => [...(current || []), newFormulation])
    setActiveFormulationId(newFormulation.id)
    setActiveView('formulation')
    toast.success('New formulation created')
  }

  const handleCreateBOM = async () => {
    if (!activeFormulation) {
      toast.error('Please select a formulation first')
      return
    }
    const newBOM = createEmptyBOM(activeFormulation.id)
    newBOM.name = `BOM for ${activeFormulation.name}`
    newBOM.batchSize = activeFormulation.targetYield
    newBOM.batchUnit = activeFormulation.yieldUnit
    setBOMs(current => [...(current || []), newBOM])
    setActiveBOMId(newBOM.id)
    setActiveView('bom')
    toast.success('BOM created')
  }

  const handleUpdateFormulation = (updated: Formulation) => {
    setFormulations(current =>
      (current || []).map(f => f.id === updated.id ? updated : f)
    )
  }

  const handleUpdateBOM = (updated: BOM) => {
    setBOMs(current =>
      (current || []).map(b => b.id === updated.id ? updated : b)
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
      ...activeFormulation.ingredients.map((ing) => ({
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

  const handleLoadRelationshipGraph = async () => {
    try {
      const result = await neo4jClient.getRelationshipGraph()
      setRelationshipGraphData(result)
      toast.success('Relationship graph loaded')
    } catch (error) {
      toast.error('Failed to load relationship graph')
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-center" />
      
      <header className="border-b border-border bg-white shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r border-border pr-4">
              <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
                <Flask className="text-white" size={24} weight="bold" />
              </div>
              <div className="font-bold text-xl text-primary tracking-wide">TCS</div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Formulation Graph Studio</h1>
              <p className="text-xs text-muted-foreground">
                Enterprise F&B Formulation Management & BOM Configuration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Gear size={18} weight="bold" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <Neo4jSettings />
              </DialogContent>
            </Dialog>
            <Button onClick={handleCreateFormulation} className="gap-2">
              <Plus size={18} weight="bold" />
              New Formulation
            </Button>
            {activeFormulation && (
              <Button onClick={handleCreateBOM} variant="outline" className="gap-2">
                <Cube size={18} weight="bold" />
                Create BOM
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="space-y-6">
          <Card className="p-4 shadow-sm">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'formulation' | 'bom' | 'relationships')}>
              <div className="flex items-center gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="formulation" className="gap-2">
                    <Flask size={16} weight="bold" />
                    Formulation
                  </TabsTrigger>
                  <TabsTrigger value="bom" className="gap-2">
                    <Cube size={16} weight="bold" />
                    BOM Configurator
                  </TabsTrigger>
                  <TabsTrigger value="relationships" className="gap-2">
                    <GitBranch size={16} weight="bold" />
                    Relationships
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 flex gap-2 overflow-x-auto">
                  {activeView === 'formulation' && (formulations || []).map((f) => (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={f.id === activeFormulationId ? 'default' : 'outline'}
                      onClick={() => setActiveFormulationId(f.id)}
                    >
                      {f.name}
                    </Button>
                  ))}
                  {activeView === 'bom' && (boms || []).map((b) => (
                    <Button
                      key={b.id}
                      size="sm"
                      variant={b.id === activeBOMId ? 'default' : 'outline'}
                      onClick={() => setActiveBOMId(b.id)}
                    >
                      {b.name}
                    </Button>
                  ))}
                </div>
              </div>

              <TabsContent value="formulation" className="mt-0">
                {(formulations || []).length === 0 ? (
                  <Card className="p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Flask className="text-primary" size={32} weight="duotone" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">Welcome to Formulation Graph Studio</h2>
                    <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                      Create, manage, and visualize Food & Beverage formulations with integrated PLM, SAP MDG,
                      and Neo4j graph relationships. Calculate yields, costs, and optimize your recipes.
                    </p>
                    <Button onClick={handleCreateFormulation} size="lg" className="gap-2">
                      <Plus size={20} weight="bold" />
                      Create Your First Formulation
                    </Button>
                  </Card>
                ) : activeFormulation ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className="xl:col-span-2 space-y-6">
                        <FormulationEditor
                          formulation={activeFormulation}
                          onChange={handleUpdateFormulation}
                        />

                        <Card className="p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Graph size={24} className="text-primary" weight="bold" />
                              <h3 className="font-semibold text-lg">Relationship Graph</h3>
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
                                <Database size={16} className="mr-1" weight="bold" />
                                Load from Neo4j
                              </Button>
                              <select
                                className="px-3 py-1 text-sm border rounded-md bg-white"
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
                      </div>

                      <div className="space-y-6">
                        <Tabs defaultValue="calculations">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="calculations">
                              <Calculator size={16} className="mr-1" weight="bold" />
                              Calculations
                            </TabsTrigger>
                            <TabsTrigger value="integrations">
                              <Database size={16} className="mr-1" weight="bold" />
                              Integrations
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="calculations">
                            <CalculationPanel
                              formulation={activeFormulation}
                              onScaledFormulation={handleUpdateFormulation}
                            />
                          </TabsContent>

                          <TabsContent value="integrations">
                            <IntegrationPanel />
                          </TabsContent>
                        </Tabs>

                        <Card className="p-6 bg-accent/30 shadow-sm">
                          <h3 className="font-semibold mb-3 text-sm">System Status</h3>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Neo4j:</span>
                              <span className={`font-semibold ${neo4jClient.isMockMode() ? 'text-yellow-600' : neo4jClient.isConnected() ? 'text-green-600' : 'text-red-600'}`}>
                                {neo4jClient.isMockMode() ? 'Mock Mode' : neo4jClient.isConnected() ? 'Connected' : 'Disconnected'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Database:</span>
                              <span className="font-semibold text-foreground">{neo4jClient.getConfig().database}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">URI:</span>
                              <span className="font-semibold text-foreground text-[10px] truncate max-w-[180px]">{neo4jClient.getConfig().uri}</span>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <Card className="p-12 text-center shadow-sm">
                      <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Flask className="text-primary" size={32} weight="duotone" />
                      </div>
                      <p className="text-muted-foreground">Select a formulation to edit</p>
                    </Card>
                  )
                }
                </TabsContent>

                <TabsContent value="bom" className="mt-0">
                  {activeBOM ? (
                    <BOMConfigurator
                      bom={activeBOM}
                      onChange={handleUpdateBOM}
                    />
                  ) : (
                    <Card className="p-12 text-center shadow-sm">
                      <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Cube className="text-primary" size={32} weight="duotone" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No BOM Selected</h3>
                      <p className="text-muted-foreground mb-4">
                        Select a formulation and create a BOM to start configuring
                      </p>
                      {activeFormulation && (
                        <Button onClick={handleCreateBOM} className="gap-2">
                          <Plus size={18} weight="bold" />
                          Create BOM for {activeFormulation.name}
                        </Button>
                      )}
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="relationships" className="mt-0">
                  <RelationshipGraphViewer
                    data={relationshipGraphData}
                    onRefresh={handleLoadRelationshipGraph}
                    onNodeSelect={(node) => {
                      if (node) {
                        console.log('Selected node:', node)
                      }
                    }}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
      </main>

      <footer className="border-t border-border bg-white py-4 mt-auto">
        <div className="px-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">TCS</span>
            <span>|</span>
            <span>Formulation Graph Studio</span>
            <span>|</span>
            <span>Enterprise F&B Management Platform</span>
          </div>
          <div>© 2024 Tata Consultancy Services Limited</div>
        </div>
      </footer>
    </div>
  )
}

export default App
