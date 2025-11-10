import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataExportButton } from '@/components/DataExportButton'
import ParetoAnalysis from '@/components/formulation/ParetoAnalysis'
import { FormulationEditor } from '@/components/formulation/FormulationEditor'
import { apiService } from '@/lib/api/service'
import { toast } from 'sonner'
import { Plus, Flask, Trash, FloppyDiskBack, ArrowCounterClockwise } from '@phosphor-icons/react'

const normalizeFormulation = (formulation) => {
  if (!formulation) {
    return null
  }

  const ingredients = Array.isArray(formulation.ingredients) ? formulation.ingredients : []

  const normalizedIngredients = ingredients.map((ingredient, index) => ({
    id: ingredient.id ?? `${formulation.id}-ingredient-${index}`,
    name: ingredient.name || '',
    percentage: Number.isFinite(Number(ingredient.percentage)) ? Number(ingredient.percentage) : 0,
    function: ingredient.function || 'unspecified',
    cost_per_kg: Number.isFinite(Number(ingredient.cost_per_kg))
      ? Number(ingredient.cost_per_kg)
      : Number.isFinite(Number(ingredient.costPerKg))
        ? Number(ingredient.costPerKg)
        : 0,
  }))

  const totalPercentage = normalizedIngredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0)

  return {
    id: formulation.id,
    name: formulation.name || 'Untitled Formulation',
    description: formulation.description || '',
    status: formulation.status || 'draft',
    created_at: formulation.created_at,
    updated_at: formulation.updated_at,
    ingredients: normalizedIngredients,
    total_percentage: totalPercentage,
  }
}

export function FormulationsView({ backendUrl }) {
  const [formulations, setFormulations] = useState([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [editorDraft, setEditorDraft] = useState(null)

  apiService.setBaseUrl(backendUrl)

  const loadFormulations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiService.getFormulations()
      const items = Array.isArray(data?.formulations) ? data.formulations.map(normalizeFormulation) : []
      setFormulations(items)
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id)
      } else if (selectedId) {
        const stillExists = items.some((item) => item.id === selectedId)
        if (!stillExists && items.length > 0) {
          setSelectedId(items[0].id)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load formulations')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    loadFormulations()
  }, [loadFormulations])

  const resolveCurrentUser = async () => {
    const storedLogin = typeof window !== 'undefined' ? window.localStorage?.getItem('app-user-login') : null
    if (storedLogin) {
      return { login: storedLogin }
    }

    return { login: 'local-developer', name: 'Local Developer' }
  }

  const handleCreate = async () => {
    try {
      const user = await resolveCurrentUser()
      const newFormulation = await apiService.createFormulation({
        name: `Draft Formulation ${formulations.length + 1}`,
        description: `Draft created by ${user?.login || user?.name || 'local-developer'}`,
        status: 'draft',
        ingredients: [
          {
            name: 'Placeholder Ingredient',
            percentage: 100,
            cost_per_kg: 0,
            function: 'unspecified',
          },
        ],
      })

      const normalized = normalizeFormulation(newFormulation)
      const updated = [...formulations, normalized]
      setFormulations(updated)
      setSelectedId(normalized.id)
      toast.success('Formulation created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create formulation')
    }
  }

  const handleDelete = async (id) => {
    try {
      await apiService.deleteFormulation(id)
      const updated = formulations.filter(f => f.id !== id)
      setFormulations(updated)
      if (selectedId === id) {
        setSelectedId(updated.length > 0 ? updated[0].id : null)
      }
      toast.success('Formulation deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete formulation')
    }
  }

  const selectedFormulation = useMemo(
    () => formulations.find((f) => f.id === selectedId) || null,
    [formulations, selectedId]
  )

  const normalizedSelected = useMemo(
    () => (selectedFormulation ? normalizeFormulation(selectedFormulation) : null),
    [selectedFormulation]
  )

  useEffect(() => {
    if (normalizedSelected) {
      setEditorDraft(normalizedSelected)
    } else {
      setEditorDraft(null)
    }
  }, [normalizedSelected])

  const hasChanges = useMemo(() => {
    if (!normalizedSelected || !editorDraft) {
      return false
    }
    return JSON.stringify(editorDraft) !== JSON.stringify(normalizedSelected)
  }, [editorDraft, normalizedSelected])

  const handleSave = async () => {
    if (!editorDraft || !selectedId) {
      return
    }

    const totalPercentage = editorDraft.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0), 0)
    if (Math.abs(totalPercentage - 100) > 0.1) {
      toast.error(`Ingredient percentages must sum to 100%. Current total: ${totalPercentage.toFixed(2)}%`)
      return
    }

    const payload = {
      name: editorDraft.name,
      description: editorDraft.description || null,
      status: editorDraft.status,
      ingredients: editorDraft.ingredients.map((ing) => ({
        name: ing.name,
        percentage: Number(ing.percentage) || 0,
        cost_per_kg: Number(ing.cost_per_kg) || 0,
        function: ing.function || 'unspecified',
      })),
    }

    setIsSaving(true)

    try {
      const updated = await apiService.updateFormulation(selectedId, payload)
      const normalized = normalizeFormulation(updated)
      setFormulations((current) => current.map((item) => (item.id === selectedId ? normalized : item)))
      setEditorDraft(normalized)
      toast.success('Formulation updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update formulation')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetChanges = () => {
    if (normalizedSelected) {
      setEditorDraft(normalizedSelected)
    }
  }

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
                          {formulation.total_percentage?.toFixed?.(2) ?? '0.00'}% total • {formulation.status}
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
          {editorDraft && selectedFormulation ? (
            <Card className="p-6 space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedFormulation.name}</h3>
                  <p className="text-muted-foreground">
                    Total percentage: {selectedFormulation.total_percentage?.toFixed?.(2) ?? '0.00'}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {selectedFormulation.updated_at ? new Date(selectedFormulation.updated_at).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{editorDraft.status}</Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleResetChanges}
                    disabled={!hasChanges || isSaving}
                    title="Reset changes"
                  >
                    <ArrowCounterClockwise size={18} />
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="gap-2"
                  >
                    <FloppyDiskBack size={18} />
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(selectedFormulation.id)}
                    disabled={isSaving}
                  >
                    <Trash size={18} />
                  </Button>
                </div>
              </div>

              <FormulationEditor formulation={editorDraft} onChange={setEditorDraft} />

              {editorDraft.ingredients.length > 0 && (
                <ParetoAnalysis ingredients={editorDraft.ingredients} />
              )}
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
