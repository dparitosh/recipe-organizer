import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NutritionLabel } from '@/components/nutrition/NutritionLabel'
import { AIAssistantPanel } from '@/components/AIAssistantPanel'
import { apiService } from '@/lib/api/service'
import { normalizeFormulation } from '@/lib/utils/formulation-utils'
import { toast } from 'sonner'
import {
  ChatsCircle,
  Database,
  CloudArrowDown,
  CookingPot,
  Sparkle,
  FloppyDiskBack,
} from '@phosphor-icons/react'

const DEFAULT_FDC_SEARCH = 'cola beverage'

export function ConversationAIView({ backendUrl }) {
  const [formulations, setFormulations] = useState([])
  const [loadingFormulations, setLoadingFormulations] = useState(false)
  const [selectedFormulationId, setSelectedFormulationId] = useState(null)
  const [nutritionLabel, setNutritionLabel] = useState(null)
  const [generatingLabel, setGeneratingLabel] = useState(false)
  const [servingSize, setServingSize] = useState(355)
  const [servingUnit, setServingUnit] = useState('mL')
  const [servingsPerContainer, setServingsPerContainer] = useState('1')

  const [fdcSearchTerm, setFdcSearchTerm] = useState(DEFAULT_FDC_SEARCH)
  const [fdcCount, setFdcCount] = useState(5)
  const [fdcApiKey, setFdcApiKey] = useState('')
  const [ingestingFdc, setIngestingFdc] = useState(false)
  const [fdcSummary, setFdcSummary] = useState(null)
  const [fdcFailures, setFdcFailures] = useState([])
  const [fdcFoods, setFdcFoods] = useState([])
  const [loadingFoods, setLoadingFoods] = useState(false)

  useEffect(() => {
    if (backendUrl) {
      apiService.setBaseUrl(backendUrl)
    }
  }, [backendUrl])

  const loadFormulations = useCallback(async () => {
    setLoadingFormulations(true)
    try {
      const data = await apiService.getFormulations()
      const items = Array.isArray(data?.formulations)
        ? data.formulations.map(normalizeFormulation).filter(Boolean)
        : []
      setFormulations(items)

      if (!selectedFormulationId && items.length > 0) {
        setSelectedFormulationId(items[0].id)
      } else if (selectedFormulationId) {
        const exists = items.some((item) => item.id === selectedFormulationId)
        if (!exists && items.length > 0) {
          setSelectedFormulationId(items[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load formulations', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load formulations')
    } finally {
      setLoadingFormulations(false)
    }
  }, [selectedFormulationId])

  const loadFdcFoods = useCallback(async () => {
    setLoadingFoods(true)
    try {
      const result = await apiService.listFDCFoods({ pageSize: 6 })
      setFdcFoods(result?.items || [])
    } catch (error) {
      console.error('Failed to load FDC foods', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load FDC foods')
    } finally {
      setLoadingFoods(false)
    }
  }, [])

  useEffect(() => {
    loadFormulations()
  }, [loadFormulations])

  useEffect(() => {
    loadFdcFoods()
  }, [loadFdcFoods])

  const activeFormulation = useMemo(
    () => formulations.find((item) => item.id === selectedFormulationId) || null,
    [formulations, selectedFormulationId]
  )

  const handleQuickIngest = async () => {
    if (!fdcSearchTerm.trim()) {
      toast.error('Enter a search term to ingest FDC data')
      return
    }

    setIngestingFdc(true)
    setFdcSummary(null)
    setFdcFailures([])

    try {
      const response = await apiService.quickIngestFDC(fdcSearchTerm.trim(), {
        count: Number.isFinite(Number(fdcCount)) ? Number(fdcCount) : 5,
        apiKey: fdcApiKey.trim() || undefined,
      })

      setFdcSummary(response.summary)
      setFdcFailures(response.failures || [])

      toast.success(
        response.success_count > 0
          ? `Ingested ${response.success_count} FDC record${response.success_count === 1 ? '' : 's'}`
          : 'Ingestion completed without new records'
      )

      loadFdcFoods()
    } catch (error) {
      console.error('Failed to ingest FDC data', error)
      toast.error(error instanceof Error ? error.message : 'Failed to ingest FDC data')
    } finally {
      setIngestingFdc(false)
    }
  }

  const handleGenerateLabel = async () => {
    if (!selectedFormulationId) {
      toast.error('Select a formulation first')
      return
    }

    setGeneratingLabel(true)
    try {
      const servingsValue = parseFloat(servingsPerContainer)
      const response = await apiService.generateNutritionLabel(selectedFormulationId, {
        servingSize: Number(servingSize) || 100,
        servingSizeUnit: servingUnit || 'g',
        servingsPerContainer: Number.isFinite(servingsValue) && servingsValue > 0 ? servingsValue : undefined,
      })
      setNutritionLabel(response)
      toast.success('Nutrition label ready')
    } catch (error) {
      console.error('Failed to generate nutrition label', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate nutrition label')
    } finally {
      setGeneratingLabel(false)
    }
  }

  const summaryTiles = [
    {
      label: 'Foods Ingested',
      value: fdcSummary?.foods_ingested ?? fdcSummary?.foodsProcessed ?? fdcSummary?.foods_processed ?? 0,
    },
    {
      label: 'Nutrients Linked',
      value: fdcSummary?.nutrients_linked ?? 0,
    },
    {
      label: 'Neo4j Nodes',
      value: fdcSummary?.neo4j_nodes_created ?? 0,
    },
    {
      label: 'Neo4j Relationships',
      value: fdcSummary?.neo4j_relationships_created ?? 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <ChatsCircle size={28} weight="fill" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Conversation AI</h2>
            <p className="text-muted-foreground text-sm">
              Query your knowledge graph with GraphRAG, ingest fresh USDA FDC data, and generate FDA-style nutrition labels in one workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <AIAssistantPanel
            formulations={formulations}
            activeFormulationId={selectedFormulationId || undefined}
          />
        </div>

        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={20} className="text-primary" weight="bold" />
                <h3 className="font-semibold">FDC Knowledge Pull</h3>
              </div>
              <Badge variant="outline" className="text-xs">
                GraphRAG
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="fdc-search">Search Term</Label>
                <Input
                  id="fdc-search"
                  value={fdcSearchTerm}
                  onChange={(event) => setFdcSearchTerm(event.target.value)}
                  placeholder="e.g. cola beverage"
                  disabled={ingestingFdc}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fdc-count">Max Results</Label>
                  <Input
                    id="fdc-count"
                    type="number"
                    min={1}
                    max={50}
                    value={fdcCount}
                    onChange={(event) => setFdcCount(Number(event.target.value) || 5)}
                    disabled={ingestingFdc}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fdc-api">API Key (optional)</Label>
                  <Input
                    id="fdc-api"
                    value={fdcApiKey}
                    onChange={(event) => setFdcApiKey(event.target.value)}
                    placeholder="Override default key"
                    disabled={ingestingFdc}
                  />
                </div>
              </div>
              <Button onClick={handleQuickIngest} disabled={ingestingFdc} className="gap-2 w-full">
                {ingestingFdc ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <CloudArrowDown size={18} />
                    Ingest from FDC
                  </>
                )}
              </Button>
            </div>

            {fdcSummary && (
              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Ingestion Summary</p>
                <div className="grid grid-cols-2 gap-2">
                  {summaryTiles.map((tile) => (
                    <div key={tile.label} className="p-3 rounded-md border bg-secondary/20">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{tile.label}</p>
                      <p className="text-lg font-semibold">{tile.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fdcFailures.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-destructive mb-2">Failed Imports</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {fdcFailures.slice(0, 3).map((failure) => (
                    <li key={failure.fdc_id ?? failure.fdcId}>
                      <span className="font-medium">FDC {failure.fdc_id ?? failure.fdcId}:</span> {failure.message}
                    </li>
                  ))}
                  {fdcFailures.length > 3 && (
                    <li>...and {fdcFailures.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CookingPot size={18} className="text-primary" />
                  <h4 className="text-sm font-semibold">Recently Ingested Foods</h4>
                </div>
                <Button variant="ghost" size="sm" onClick={loadFdcFoods} disabled={loadingFoods} className="gap-1">
                  <Sparkle size={14} />
                  Refresh
                </Button>
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-2">
                  {loadingFoods && (
                    <p className="text-xs text-muted-foreground">Loading foods...</p>
                  )}
                  {!loadingFoods && fdcFoods.length === 0 && (
                    <p className="text-xs text-muted-foreground">No ingested foods yet.</p>
                  )}
                  {fdcFoods.map((food) => (
                    <div key={food.fdcId} className="border rounded-md p-3 bg-accent/20">
                      <p className="text-sm font-semibold leading-tight">{food.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {(food.brandOwner || food.brandName) ?? 'USDA FoodData Central'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                        {food.foodCategory && (
                          <Badge variant="outline" className="text-[10px]">
                            {food.foodCategory}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          FDC {food.fdcId}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FloppyDiskBack size={20} className="text-primary" weight="bold" />
                <h3 className="font-semibold">Nutrition Label Generator</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                FDA Format
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="formulation-select">Formulation</Label>
                <Select
                  value={selectedFormulationId ?? ''}
                  onValueChange={(value) => setSelectedFormulationId(value)}
                  disabled={loadingFormulations || formulations.length === 0}
                >
                  <SelectTrigger id="formulation-select">
                    <SelectValue placeholder={loadingFormulations ? 'Loading...' : 'Select formulation'} />
                  </SelectTrigger>
                  <SelectContent>
                    {formulations.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="serving-size">Serving Size</Label>
                  <Input
                    id="serving-size"
                    type="number"
                    min={1}
                    value={servingSize}
                    onChange={(event) => setServingSize(Number(event.target.value) || 100)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="serving-unit">Unit</Label>
                  <Input
                    id="serving-unit"
                    value={servingUnit}
                    onChange={(event) => setServingUnit(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="servings-container">Servings/Container</Label>
                  <Input
                    id="servings-container"
                    value={servingsPerContainer}
                    onChange={(event) => setServingsPerContainer(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <Button onClick={handleGenerateLabel} disabled={generatingLabel || !selectedFormulationId} className="gap-2 w-full">
                {generatingLabel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Sparkle size={18} />
                    Generate Nutrition Label
                  </>
                )}
              </Button>
            </div>

            {nutritionLabel && (
              <div className="pt-4 border-t">
                <NutritionLabel nutritionFacts={nutritionLabel} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ConversationAIView
