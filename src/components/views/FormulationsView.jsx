import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { DataExportButton } from '@/components/DataExportButton'
import ParetoAnalysis from '@/components/formulation/ParetoAnalysis'
import { FormulationEditor } from '@/components/formulation/FormulationEditor'
import { NutritionLabel } from '@/components/nutrition/NutritionLabel'
import { apiService } from '@/lib/api/service'
import { envService } from '@/lib/services/env-service.js'
import { normalizeFormulation } from '@/lib/utils/formulation-utils'
import { toast } from 'sonner'
import { MagnifyingGlass, Plus, Flask, Trash, FloppyDiskBack, ArrowCounterClockwise, Article } from '@phosphor-icons/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function FormulationsView({ backendUrl }) {
  const [formulations, setFormulations] = useState([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [editorDraft, setEditorDraft] = useState(null)
  const [nutritionLabel, setNutritionLabel] = useState(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  apiService.setBaseUrl(backendUrl)

  const loadFormulations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiService.getFormulations()
      const items = Array.isArray(data?.formulations)
        ? data.formulations.map(normalizeFormulation).filter(Boolean)
        : []
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

  const filteredFormulations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return formulations.filter((formulation) => {
      if (!formulation) {
        return false
      }

      const matchesStatus = statusFilter === 'all' || formulation.status === statusFilter
      const matchesSearch =
        term.length === 0 ||
        formulation.name?.toLowerCase().includes(term) ||
        formulation.description?.toLowerCase().includes(term)

      return matchesStatus && matchesSearch
    })
  }, [formulations, statusFilter, searchTerm])

  useEffect(() => {
    if (!selectedId) {
      if (filteredFormulations.length > 0) {
        setSelectedId(filteredFormulations[0].id)
      }
      return
    }

    const selectedStillVisible = filteredFormulations.some((item) => item.id === selectedId)
    if (!selectedStillVisible) {
      setSelectedId(filteredFormulations[0]?.id ?? null)
    }
  }, [filteredFormulations, selectedId])

  const filtersActive = statusFilter !== 'all' || searchTerm.trim().length > 0

  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter('all')
  }, [])

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

  // Derive quick-glance analytics for the currently edited formulation.
  const formulationMetrics = useMemo(() => {
    if (!editorDraft) {
      return null
    }

    const ingredientCount = editorDraft.ingredients.length
    const totalPercentage = editorDraft.ingredients.reduce(
      (sum, ing) => sum + (Number(ing.percentage) || 0),
      0
    )

    if (ingredientCount === 0) {
      return {
        ingredientCount: 0,
        totalPercentage,
        totalCostPerKg: 0,
        missingCostCount: 0,
        dominantFunctionLabel: 'Unspecified',
        costCoverage: 0,
        highestCostIngredient: null,
      }
    }

    const totalCostPerKg = editorDraft.ingredients.reduce((sum, ing) => {
      const percentage = Number(ing.percentage) || 0
      const cost = Number(ing.cost_per_kg) || 0
      return sum + (percentage / 100) * cost
    }, 0)

    const missingCostCount = editorDraft.ingredients.filter((ing) => !(Number(ing.cost_per_kg) > 0)).length

    const highestCostIngredient = editorDraft.ingredients.reduce(
      (acc, ing) => {
        const cost = Number(ing.cost_per_kg) || 0
        if (cost > acc.cost) {
          return { name: ing.name || 'Unnamed Ingredient', cost }
        }
        return acc
      },
      { name: null, cost: -Infinity }
    )

    const functionTally = editorDraft.ingredients.reduce((map, ing) => {
      const key = ing.function || 'unspecified'
      map[key] = (map[key] || 0) + 1
      return map
    }, {})

    const dominantFunctionEntry = Object.entries(functionTally).sort((a, b) => b[1] - a[1])[0] ?? ['unspecified', 0]

    const formatLabel = (label) =>
      label
        .split(/[_\s-]+/)
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
        .join(' ')

    const costCoverage = ((ingredientCount - missingCostCount) / ingredientCount) * 100

    return {
      ingredientCount,
      totalPercentage,
      totalCostPerKg,
      missingCostCount,
      dominantFunctionLabel: formatLabel(dominantFunctionEntry[0]),
      costCoverage,
      highestCostIngredient: highestCostIngredient.name ? highestCostIngredient : null,
    }
  }, [editorDraft])

  const issueMessages = useMemo(() => {
    if (!formulationMetrics) {
      return []
    }

    const issues = []
    const delta = Math.abs(formulationMetrics.totalPercentage - 100)

    if (formulationMetrics.ingredientCount === 0) {
      issues.push({
        severity: 'warning',
        text: 'Add at least one ingredient to start evaluating this formulation.',
      })
    }

    if (delta > 1) {
      issues.push({
        severity: 'error',
        text: `Ingredient percentages sum to ${formulationMetrics.totalPercentage.toFixed(2)}% (target 100%).`,
      })
    } else if (delta > 0.1) {
      issues.push({
        severity: 'warning',
        text: `Ingredient percentages are ${delta.toFixed(2)}% away from 100%.`,
      })
    }

    if (formulationMetrics.missingCostCount > 0) {
      issues.push({
        severity: 'warning',
        text: `${formulationMetrics.missingCostCount} ingredient${
          formulationMetrics.missingCostCount === 1 ? '' : 's'
        } missing cost per kg values.`,
      })
    }

    if (formulationMetrics.totalCostPerKg <= 0 && formulationMetrics.ingredientCount > 0) {
      issues.push({
        severity: 'warning',
        text: 'Estimated cost per kg is zero; update ingredient costs to unlock pricing analytics.',
      })
    }

    return issues
  }, [formulationMetrics])

  const hasIssues = issueMessages.length > 0
  const hasCriticalIssue = issueMessages.some((issue) => issue.severity === 'error')

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

  const handleGenerateNutritionLabel = async () => {
    if (!selectedId) return
    
    setLoadingNutrition(true)
    setNutritionLabel(null)
    
    try {
      const response = await fetch(
        `${backendUrl}/api/formulations/${selectedId}/nutrition-label?serving_size=100&serving_size_unit=g`,
        {
          method: 'POST',
          headers: {
            ...envService.getAuthHeaders(),
          },
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to generate nutrition label')
      }
      
      const data = await response.json()
      setNutritionLabel(data)
      toast.success('Nutrition label generated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate nutrition label')
    } finally {
      setLoadingNutrition(false)
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
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">All Formulations</h3>
              <Badge variant="outline" className="text-xs">
                {filteredFormulations.length} / {formulations.length || 0}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search formulations..."
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : filteredFormulations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Flask size={48} className="mx-auto mb-2 opacity-50" />
                <p>{filtersActive ? 'No formulations match your filters' : 'No formulations yet'}</p>
                {filtersActive && (
                  <Button variant="ghost" size="sm" className="mt-3" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-[420px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ingredients</TableHead>
                      <TableHead className="text-right">Total %</TableHead>
                      <TableHead className="text-right">Cost / kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFormulations.map((formulation) => {
                      const isSelected = selectedId === formulation.id
                      const totalPercentage = Number(formulation.total_percentage) || 0
                      const costPerKg = Number(formulation.cost_per_kg)

                      return (
                        <TableRow
                          key={formulation.id}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                          }`}
                          onClick={() => setSelectedId(formulation.id)}
                        >
                          <TableCell className="max-w-[180px]">
                            <div className="flex flex-col">
                              <span className="truncate font-medium">{formulation.name}</span>
                              {formulation.description && (
                                <span className="truncate text-xs text-muted-foreground">
                                  {formulation.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isSelected ? 'default' : 'secondary'}>{formulation.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {Array.isArray(formulation.ingredients) ? formulation.ingredients.length : 0}
                          </TableCell>
                          <TableCell className="text-right">{totalPercentage.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {Number.isFinite(costPerKg) && costPerKg > 0 ? costPerKg.toFixed(2) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
                    onClick={handleGenerateNutritionLabel}
                    disabled={loadingNutrition}
                    className="gap-2"
                    title="Generate nutrition facts label"
                  >
                    <Article size={18} />
                    {loadingNutrition ? 'Generating...' : 'Nutrition Label'}
                  </Button>
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

              {formulationMetrics && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-secondary/20 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingredients</p>
                      <p className="mt-2 text-2xl font-semibold">{formulationMetrics.ingredientCount}</p>
                    </div>
                    <div className="rounded-lg border bg-secondary/20 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Est. Cost / kg</p>
                      <p className="mt-2 text-2xl font-semibold">{formulationMetrics.totalCostPerKg.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border bg-secondary/20 p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dominant Function</p>
                      <p className="mt-2 text-base font-medium">{formulationMetrics.dominantFunctionLabel}</p>
                      <p className="text-xs text-muted-foreground mt-2">Cost coverage {Math.round(formulationMetrics.costCoverage)}%</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Formula completion</span>
                      <span
                        className={
                          Math.abs(formulationMetrics.totalPercentage - 100) <= 0.1
                            ? 'text-muted-foreground'
                            : 'text-destructive'
                        }
                      >
                        {formulationMetrics.totalPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(formulationMetrics.totalPercentage, 100)}
                      className="mt-2"
                    />
                  </div>

                  <Alert variant={hasCriticalIssue ? 'destructive' : 'default'}>
                    <AlertTitle>
                      {hasIssues
                        ? hasCriticalIssue
                          ? 'Formulation Needs Attention'
                          : 'Review Suggested Adjustments'
                        : 'Formulation Looks Good'}
                    </AlertTitle>
                    <AlertDescription>
                      {hasIssues ? (
                        issueMessages.map((issue, index) => (
                          <p key={`${issue.text}-${index}`}>{issue.text}</p>
                        ))
                      ) : (
                        <p>
                          {formulationMetrics.totalCostPerKg > 0
                            ? `Estimated cost per kg is ${formulationMetrics.totalCostPerKg.toFixed(2)}.`
                            : 'Estimated cost per kg is not available yet.'}
                          {formulationMetrics.highestCostIngredient
                            ? ` Highest cost ingredient: ${formulationMetrics.highestCostIngredient.name} (${formulationMetrics.highestCostIngredient.cost.toFixed(2)} per kg).`
                            : ''}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <FormulationEditor formulation={editorDraft} onChange={setEditorDraft} />

              {nutritionLabel && (
                <div className="flex justify-center">
                  <NutritionLabel nutritionFacts={nutritionLabel} />
                </div>
              )}

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
