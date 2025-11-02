import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash, 
  TreeStructure, 
  FlowArrow, 
  ChartBar,
  Warning,
  CheckCircle,
  Cube,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { BOM, BOMComponent, ProcessStep, ProcessYield } from '@/lib/schemas/bom'
import { toast } from 'sonner'
import { IngredientTree } from './IngredientTree'
import { ProcessStepEditor } from './ProcessStepEditor'
import { CalculationSummary } from './CalculationSummary'

interface BOMConfiguratorProps {
  bom: BOM
  onChange: (updated: BOM) => void
  onCalculate?: () => Promise<CalculationResult>
}

export interface CalculationResult {
  totalYield: number
  totalWaste: number
  actualOutput: number
  byproducts: Byproduct[]
  costBreakdown: CostBreakdown
  warnings: string[]
}

export interface Byproduct {
  id: string
  name: string
  quantity: number
  unit: string
  value?: number
}

export interface CostBreakdown {
  materialCost: number
  processingCost: number
  overheadCost: number
  totalCost: number
  costPerUnit: number
}

export function BOMConfigurator({ bom, onChange, onCalculate }: BOMConfiguratorProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    validateBOM()
  }, [bom])

  const validateBOM = () => {
    const errors: string[] = []

    bom.components.forEach((comp) => {
      if (comp.quantity <= 0) {
        errors.push(`${comp.description}: Quantity must be positive`)
      }

      const roundingError = comp.quantity % 0.001
      if (roundingError > 0.0001) {
        errors.push(`${comp.description}: Quantity has excessive decimal precision`)
      }
    })

    bom.process.forEach((step) => {
      if (step.yields) {
        const lossPercentage = ((step.yields.input - step.yields.output) / step.yields.input) * 100
        if (lossPercentage > 20) {
          errors.push(`${step.name}: High loss detected (${lossPercentage.toFixed(1)}%)`)
        }
      }
    })

    setValidationErrors(errors)
  }

  const handleAddComponent = () => {
    const newComponent: BOMComponent = {
      id: `comp-${Date.now()}`,
      materialId: `MAT-${Date.now()}`,
      description: 'New Component',
      quantity: 0,
      unit: 'kg',
      phase: 'production',
      cost: 0
    }

    onChange({
      ...bom,
      components: [...bom.components, newComponent]
    })

    setSelectedComponentId(newComponent.id)
    toast.success('Component added')
  }

  const handleUpdateComponent = (id: string, updates: Partial<BOMComponent>) => {
    onChange({
      ...bom,
      components: bom.components.map(comp =>
        comp.id === id ? { ...comp, ...updates } : comp
      )
    })
  }

  const handleRemoveComponent = (id: string) => {
    onChange({
      ...bom,
      components: bom.components.filter(comp => comp.id !== id)
    })

    if (selectedComponentId === id) {
      setSelectedComponentId(null)
    }

    toast.success('Component removed')
  }

  const handleAddProcessStep = () => {
    const maxOrder = bom.process.length > 0 
      ? Math.max(...bom.process.map(s => s.order)) 
      : 0

    const newStep: ProcessStep = {
      id: `step-${Date.now()}`,
      order: maxOrder + 1,
      name: 'New Process Step',
      description: '',
      duration: 0,
      durationUnit: 'minutes',
      parameters: {}
    }

    onChange({
      ...bom,
      process: [...bom.process, newStep]
    })

    setSelectedStepId(newStep.id)
    toast.success('Process step added')
  }

  const handleUpdateProcessStep = (id: string, updates: Partial<ProcessStep>) => {
    onChange({
      ...bom,
      process: bom.process.map(step =>
        step.id === id ? { ...step, ...updates } : step
      )
    })
  }

  const handleRemoveProcessStep = (id: string) => {
    onChange({
      ...bom,
      process: bom.process.filter(step => step.id !== id)
    })

    if (selectedStepId === id) {
      setSelectedStepId(null)
    }

    toast.success('Process step removed')
  }

  const handleCalculate = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before calculating')
      return
    }

    setIsCalculating(true)

    try {
      let result: CalculationResult

      if (onCalculate) {
        result = await onCalculate()
      } else {
        result = calculateLocal()
      }

      setCalculationResult(result)
      toast.success('Calculation complete')
    } catch (error) {
      toast.error('Calculation failed')
      console.error(error)
    } finally {
      setIsCalculating(false)
    }
  }

  const calculateLocal = (): CalculationResult => {
    const totalInput = bom.components.reduce((sum, comp) => {
      return sum + comp.quantity
    }, 0)

    let currentYield = totalInput
    const warnings: string[] = []

    bom.process.forEach(step => {
      if (step.yields) {
        const yieldPercentage = (step.yields.output / step.yields.input) * 100
        currentYield = currentYield * (yieldPercentage / 100)

        if (yieldPercentage < 90) {
          warnings.push(`${step.name}: Low yield (${yieldPercentage.toFixed(1)}%)`)
        }
      }
    })

    const totalWaste = totalInput - currentYield
    const materialCost = bom.components.reduce((sum, comp) => sum + (comp.cost * comp.quantity), 0)
    const processingCost = bom.process.length * 50
    const overheadCost = materialCost * 0.15

    return {
      totalYield: (currentYield / totalInput) * 100,
      totalWaste,
      actualOutput: currentYield,
      byproducts: [
        {
          id: 'waste-1',
          name: 'Process Waste',
          quantity: totalWaste,
          unit: bom.batchUnit
        }
      ],
      costBreakdown: {
        materialCost,
        processingCost,
        overheadCost,
        totalCost: materialCost + processingCost + overheadCost,
        costPerUnit: (materialCost + processingCost + overheadCost) / currentYield
      },
      warnings
    }
  }

  const selectedComponent = bom.components.find(c => c.id === selectedComponentId)

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-12rem)]">
      <div className="col-span-3 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TreeStructure size={20} className="text-primary" />
              <h3 className="font-semibold">Components</h3>
              <Badge variant="secondary">{bom.components.length}</Badge>
            </div>
            <Button size="sm" onClick={handleAddComponent}>
              <Plus size={16} />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <IngredientTree
              components={bom.components}
              selectedId={selectedComponentId}
              onSelect={setSelectedComponentId}
              onUpdate={handleUpdateComponent}
              onRemove={handleRemoveComponent}
            />
          </ScrollArea>

          {validationErrors.length > 0 && (
            <div className="p-4 border-t border-border bg-destructive/10">
              <div className="flex items-start gap-2">
                <Warning size={18} className="text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-semibold text-destructive">Validation Errors:</p>
                  {validationErrors.slice(0, 3).map((error, idx) => (
                    <p key={idx} className="text-destructive/90">{error}</p>
                  ))}
                  {validationErrors.length > 3 && (
                    <p className="text-destructive/70">+{validationErrors.length - 3} more</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {selectedComponent && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Cube size={18} className="text-muted-foreground" />
              <h4 className="font-semibold text-sm">Component Details</h4>
            </div>

            <div className="space-y-2">
              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  value={selectedComponent.description}
                  onChange={(e) => handleUpdateComponent(selectedComponent.id, { description: e.target.value })}
                  className="h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={selectedComponent.quantity}
                    onChange={(e) => handleUpdateComponent(selectedComponent.id, { quantity: parseFloat(e.target.value) || 0 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Select
                    value={selectedComponent.unit}
                    onValueChange={(value) => handleUpdateComponent(selectedComponent.id, { unit: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="mL">mL</SelectItem>
                      <SelectItem value="units">units</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={selectedComponent.cost}
                    onChange={(e) => handleUpdateComponent(selectedComponent.id, { cost: parseFloat(e.target.value) || 0 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phase</Label>
                  <Select
                    value={selectedComponent.phase}
                    onValueChange={(value: any) => handleUpdateComponent(selectedComponent.id, { phase: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="procurement">Procurement</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="col-span-5 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlowArrow size={20} className="text-primary" />
              <h3 className="font-semibold">Process Steps</h3>
              <Badge variant="secondary">{bom.process.length}</Badge>
            </div>
            <Button size="sm" onClick={handleAddProcessStep}>
              <Plus size={16} />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <ProcessStepEditor
              steps={bom.process}
              selectedId={selectedStepId}
              onSelect={setSelectedStepId}
              onUpdate={handleUpdateProcessStep}
              onRemove={handleRemoveProcessStep}
            />
          </ScrollArea>

          <div className="p-4 border-t border-border bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">BOM Configuration</p>
                <p className="text-xs text-muted-foreground">Batch: {bom.batchSize} {bom.batchUnit}</p>
              </div>
              <Button
                onClick={handleCalculate}
                disabled={isCalculating || validationErrors.length > 0}
                className="gap-2"
              >
                {isCalculating ? (
                  <>
                    <ArrowsClockwise size={16} className="animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <ChartBar size={16} />
                    Calculate
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-background p-2 rounded-md">
                <p className="text-muted-foreground">Components</p>
                <p className="font-semibold text-lg">{bom.components.length}</p>
              </div>
              <div className="bg-background p-2 rounded-md">
                <p className="text-muted-foreground">Process Steps</p>
                <p className="font-semibold text-lg">{bom.process.length}</p>
              </div>
              <div className="bg-background p-2 rounded-md">
                <p className="text-muted-foreground">Est. Cost</p>
                <p className="font-semibold text-lg">
                  ${bom.components.reduce((sum, c) => sum + c.cost * c.quantity, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-span-4">
        <Card className="h-full flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ChartBar size={20} className="text-primary" />
              <h3 className="font-semibold">Calculation Summary</h3>
              {calculationResult && (
                <CheckCircle size={18} className="text-green-500" weight="fill" />
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <CalculationSummary
              result={calculationResult}
              bom={bom}
            />
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
