import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, TrendUp, Package, Coins } from '@phosphor-icons/react'
import { Formulation } from '@/lib/schemas/formulation'
import { BOM } from '@/lib/schemas/bom'
import { createCalculationEngine, CalculationEngineResult, LossModel } from '@/lib/engines/calculationEngine'
import { toast } from 'sonner'

interface CalculationEngineInterfaceProps {
  formulation: Formulation
  bom?: BOM
  onCalculationComplete?: (result: CalculationEngineResult) => void
}

export function CalculationEngineInterface({
  formulation,
  bom,
  onCalculationComplete
}: CalculationEngineInterfaceProps) {
  const [targetBatchSize, setTargetBatchSize] = useState('1000')
  const [targetUnit, setTargetUnit] = useState('kg')
  const [yieldPercentage, setYieldPercentage] = useState('85')
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<CalculationEngineResult | null>(null)

  const handleCalculate = async () => {
    setCalculating(true)
    
    try {
      const engine = createCalculationEngine()
      
      const lossModels: LossModel[] = []
      
      if (bom) {
        bom.process.forEach(step => {
          if (step.yields) {
            const lossPercentage = ((step.yields.input - step.yields.output) / step.yields.input) * 100
            if (lossPercentage > 0) {
              lossModels.push({
                stepName: step.name,
                lossType: 'process',
                lossPercentage
              })
            }
          }
        })
      }
      
      const calculationResult = engine.calculate({
        formulation,
        bom,
        targetBatchSize: parseFloat(targetBatchSize),
        targetUnit,
        yieldPercentage: parseFloat(yieldPercentage),
        lossModels,
        costParameters: {
          overheadRate: 25,
          laborCostPerHour: 45,
          energyCostPerUnit: 100,
          markupPercentage: 30
        }
      })
      
      setResult(calculationResult)
      
      if (onCalculationComplete) {
        onCalculationComplete(calculationResult)
      }
      
      toast.success('Calculation completed successfully', {
        description: `Efficiency: ${calculationResult.metadata.efficiencyScore}/100`
      })
      
      if (calculationResult.warnings.length > 0) {
        calculationResult.warnings.forEach(warning => {
          toast.warning(warning)
        })
      }
    } catch (error) {
      console.error('Calculation error:', error)
      toast.error('Calculation failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={24} className="text-primary" />
          <h3 className="text-lg font-semibold">Calculation Engine</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="batch-size">Target Batch Size</Label>
            <Input
              id="batch-size"
              type="number"
              value={targetBatchSize}
              onChange={(e) => setTargetBatchSize(e.target.value)}
              placeholder="1000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-unit">Target Unit</Label>
            <Select value={targetUnit} onValueChange={setTargetUnit}>
              <SelectTrigger id="target-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                <SelectItem value="g">Grams (g)</SelectItem>
                <SelectItem value="L">Liters (L)</SelectItem>
                <SelectItem value="ml">Milliliters (mL)</SelectItem>
                <SelectItem value="lb">Pounds (lb)</SelectItem>
                <SelectItem value="gal">Gallons (gal)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yield-percent">Expected Yield (%)</Label>
            <Input
              id="yield-percent"
              type="number"
              value={yieldPercentage}
              onChange={(e) => setYieldPercentage(e.target.value)}
              placeholder="85"
              min="0"
              max="100"
            />
          </div>
        </div>

        <Button onClick={handleCalculate} disabled={calculating} className="w-full">
          {calculating ? 'Calculating...' : 'Calculate Production Batch'}
        </Button>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendUp size={20} className="text-primary" />
                <h4 className="font-semibold text-sm">Yield Performance</h4>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-medium">{result.metadata.targetYield} {result.outputUnit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-medium">{result.totalOutput.toFixed(2)} {result.outputUnit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Yield:</span>
                  <span className="font-medium">{result.metadata.actualYieldPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Efficiency:</span>
                  <span className={`font-bold ${result.metadata.efficiencyScore >= 80 ? 'text-green-500' : result.metadata.efficiencyScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {result.metadata.efficiencyScore}/100
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins size={20} className="text-primary" />
                <h4 className="font-semibold text-sm">Cost Analysis</h4>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cost:</span>
                  <span className="font-medium">${result.costRollup.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per Unit:</span>
                  <span className="font-medium">${result.costRollup.costPerUnit.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Byproduct Value:</span>
                  <span className="font-medium text-green-500">${result.costRollup.byproductValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net Cost:</span>
                  <span className="font-bold">${result.costRollup.netCost.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package size={20} className="text-primary" />
                <h4 className="font-semibold text-sm">Production Scale</h4>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Yield:</span>
                  <span className="font-medium">{result.metadata.baseYield} {formulation.yieldUnit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scale Factor:</span>
                  <span className="font-medium">{result.metadata.scaleFactor.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ingredients:</span>
                  <span className="font-medium">{result.scaledIngredients.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Byproducts:</span>
                  <span className="font-medium">{result.byproducts.length}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h4 className="font-semibold mb-4">Scaled Ingredients</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.scaledIngredients.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{ing.name}</div>
                    <div className="text-xs text-muted-foreground">{ing.function}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{ing.roundedQuantity.toFixed(2)} {targetUnit}</div>
                    <div className="text-xs text-muted-foreground">
                      {ing.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {result.yieldChain.length > 1 && (
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Yield Chain</h4>
              <div className="space-y-3">
                {result.yieldChain.filter(step => step.stepName !== 'Initial Input').map((step, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{step.stepName}</div>
                      <div className="text-sm font-semibold text-primary">
                        {step.yieldPercentage.toFixed(1)}% yield
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-3 gap-2">
                      <div>Input: {step.inputQuantity.toFixed(2)}</div>
                      <div>Output: {step.outputQuantity.toFixed(2)}</div>
                      <div className="text-red-500">Loss: {step.lossQuantity.toFixed(2)} ({step.lossPercentage.toFixed(1)}%)</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Cumulative Yield: {step.cumulativeYield.toFixed(1)}% • Type: {step.lossType}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.byproducts.length > 0 && (
            <Card className="p-6">
              <h4 className="font-semibold mb-4">Byproducts & Waste</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.byproducts.map((bp, idx) => (
                  <div key={idx} className="p-3 bg-secondary/20 rounded-lg">
                    <div className="font-medium">{bp.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {bp.quantity.toFixed(2)} {bp.unit} • {bp.category}
                    </div>
                    {bp.recoveryMethod && (
                      <div className="text-xs text-primary mt-1">
                        💡 {bp.recoveryMethod}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h4 className="font-semibold mb-4">Aggregated Nutrition (per 100g)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Calories</div>
                <div className="text-xl font-bold">{result.aggregatedNutrition.calories?.toFixed(1) || 0}</div>
                <div className="text-xs text-muted-foreground">kcal</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Protein</div>
                <div className="text-xl font-bold">{result.aggregatedNutrition.protein?.toFixed(1) || 0}</div>
                <div className="text-xs text-muted-foreground">g</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Carbs</div>
                <div className="text-xl font-bold">{result.aggregatedNutrition.carbohydrates?.toFixed(1) || 0}</div>
                <div className="text-xs text-muted-foreground">g</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fat</div>
                <div className="text-xl font-bold">{result.aggregatedNutrition.fat?.toFixed(1) || 0}</div>
                <div className="text-xs text-muted-foreground">g</div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
