import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calculator, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function CalculationSettings({ config, onConfigChange }) {
  const calculationConfig = config?.calculation ?? {
    defaultPrecision: 2,
    yieldWarningThreshold: 0.9,
    yieldCriticalThreshold: 0.8,
    highLossThreshold: 0.15,
    percentageTolerance: 0.01,
    massBalanceTolerance: 0.01,
  }

  const handleCalculationChange = (field, value) => {
    onConfigChange?.({
      calculation: {
        ...calculationConfig,
        [field]: value,
      },
    })
  }

  const handleSave = () => {
    toast.success('Calculation settings saved')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Calculator className="text-primary" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Calculation Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure precision and tolerances for formulation calculations
            </p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-precision">Default Precision (decimal places)</Label>
            <Input
              id="default-precision"
              type="number"
              value={calculationConfig.defaultPrecision}
              onChange={(event) =>
                handleCalculationChange('defaultPrecision', Math.max(0, parseInt(event.target.value, 10) || 0))
              }
              min={0}
              max={6}
            />
            <p className="text-xs text-muted-foreground">
              Number of decimal places for displaying calculated values
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yield-warning">Yield Warning Threshold</Label>
              <Input
                id="yield-warning"
                type="number"
                step="0.01"
                value={calculationConfig.yieldWarningThreshold}
                onChange={(event) =>
                  handleCalculationChange('yieldWarningThreshold', parseFloat(event.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">0-1 value</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yield-critical">Yield Critical Threshold</Label>
              <Input
                id="yield-critical"
                type="number"
                step="0.01"
                value={calculationConfig.yieldCriticalThreshold}
                onChange={(event) =>
                  handleCalculationChange('yieldCriticalThreshold', parseFloat(event.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">0-1 value</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="high-loss">High Loss Threshold</Label>
            <Input
              id="high-loss"
              type="number"
              step="0.01"
              value={calculationConfig.highLossThreshold}
              onChange={(event) =>
                handleCalculationChange('highLossThreshold', parseFloat(event.target.value) || 0)
              }
            />
            <p className="text-xs text-muted-foreground">
              Threshold for flagging high material loss (0-1 value)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percentage-tolerance">Percentage Tolerance</Label>
              <Input
                id="percentage-tolerance"
                type="number"
                step="0.001"
                value={calculationConfig.percentageTolerance}
                onChange={(event) =>
                  handleCalculationChange('percentageTolerance', parseFloat(event.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">Acceptable deviation</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mass-balance">Mass Balance Tolerance</Label>
              <Input
                id="mass-balance"
                type="number"
                step="0.001"
                value={calculationConfig.massBalanceTolerance}
                onChange={(event) =>
                  handleCalculationChange('massBalanceTolerance', parseFloat(event.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">Mass balance accuracy</p>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <CheckCircle size={18} weight="bold" />
            Save Calculation Settings
          </Button>
        </div>
      </Card>
    </div>
  )
}
