import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataExportButton } from '@/components/DataExportButton'
import { apiService, Formulation } from '@/lib/api/service'
import { toast } from 'sonner'
import { Plus, Flask, Trash } from '@phosphor-icons/react'

interface FormulationsViewProps {
  backendUrl: string
}

export function FormulationsView({ backendUrl }: FormulationsViewProps) {
  const [formulations, setFormulations] = useState<Formulation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  apiService.setBaseUrl(backendUrl)

  useEffect(() => {
    loadFormulations()
  }, [])

  const loadFormulations = async () => {
    setLoading(true)
    try {
      const data = await apiService.getFormulations()
      setFormulations(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load formulations')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const user = await window.spark.user()
      const newFormulation = await apiService.createFormulation({
        name: 'New Formulation',
        version: '1.0',
        type: 'recipe',
        status: 'draft',
        ingredients: [],
        targetYield: 100,
        yieldUnit: 'kg',
        createdBy: user?.login || 'unknown',
      })
      setFormulations([...formulations, newFormulation])
      toast.success('Formulation created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create formulation')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteFormulation(id)
      setFormulations(formulations.filter(f => f.id !== id))
      toast.success('Formulation deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete formulation')
    }
  }

  const selectedFormulation = formulations.find(f => f.id === selectedId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Formulations</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage F&B formulations
          </p>
        </div>
        <div className="flex gap-2">
          <DataExportButton 
            data={formulations}
            filename="formulations"
            disabled={loading}
          />
          <Button onClick={handleCreate} className="gap-2">
            <Plus size={20} weight="bold" />
            New Formulation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">All Formulations</h3>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Loading...</div>
            ) : formulations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Flask size={48} className="mx-auto mb-2 opacity-50" />
                <p>No formulations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formulations.map(formulation => (
                  <div
                    key={formulation.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedId === formulation.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedId(formulation.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{formulation.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          v{formulation.version} • {formulation.type}
                        </p>
                      </div>
                      <Badge variant="secondary">{formulation.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedFormulation ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">{selectedFormulation.name}</h3>
                  <p className="text-muted-foreground">
                    Version {selectedFormulation.version} • {selectedFormulation.type}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedFormulation.status}</Badge>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(selectedFormulation.id)}
                  >
                    <Trash size={18} />
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Target Yield</label>
                      <p className="text-lg font-medium">{selectedFormulation.targetYield} {selectedFormulation.yieldUnit}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created By</label>
                      <p className="text-lg font-medium">{selectedFormulation.createdBy}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Ingredients</h4>
                  {selectedFormulation.ingredients.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                      No ingredients added yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFormulation.ingredients.map(ingredient => (
                        <div key={ingredient.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium">{ingredient.name}</h5>
                              <p className="text-sm text-muted-foreground">
                                {ingredient.quantity} {ingredient.unit} • {ingredient.percentage}%
                              </p>
                            </div>
                            <Badge>{ingredient.function}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Flask size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Formulation Selected</h3>
              <p className="text-muted-foreground">
                Select a formulation from the list to view details
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
