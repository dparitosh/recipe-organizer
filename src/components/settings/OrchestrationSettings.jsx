import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Flask, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

const DEFAULT_ORCHESTRATION = {
  defaultTargetBatchSize: 1000,
  defaultTargetUnit: 'kg',
  includeNutrients: false,
  includeCosts: true,
  maxHistoryItems: 10,
}

export function OrchestrationSettings({ config, onConfigChange }) {
  const orchestrationConfig = {
    ...DEFAULT_ORCHESTRATION,
    ...(config?.orchestration ?? {}),
  }

  const handleOrchestrationChange = (field, value) => {
    onConfigChange?.({
      orchestration: {
        ...orchestrationConfig,
        [field]: value,
      },
    })
  }

  const handleSave = () => {
    toast.success('Orchestration settings saved')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Flask className="text-primary" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Multi-Agent Orchestration Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure default settings for the AI agent orchestration system
            </p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-batch-size">Default Target Batch Size</Label>
              <Input
                id="default-batch-size"
                type="number"
                value={orchestrationConfig.defaultTargetBatchSize}
                onChange={(event) =>
                  handleOrchestrationChange('defaultTargetBatchSize', parseFloat(event.target.value) || 0)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-unit">Default Target Unit</Label>
              <Select
                value={orchestrationConfig.defaultTargetUnit}
                onValueChange={(value) => handleOrchestrationChange('defaultTargetUnit', value)}
              >
                <SelectTrigger id="default-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="L">Liters (L)</SelectItem>
                  <SelectItem value="gal">Gallons (gal)</SelectItem>
                  <SelectItem value="oz">Ounces (oz)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="include-nutrients" className="text-sm font-semibold">
                  Include Nutrient Analysis
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically include nutritional analysis in orchestration results
                </p>
              </div>
              <Switch
                id="include-nutrients"
                checked={orchestrationConfig.includeNutrients}
                onCheckedChange={(checked) => handleOrchestrationChange('includeNutrients', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="include-costs" className="text-sm font-semibold">
                  Include Cost Analysis
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically include cost analysis in orchestration results
                </p>
              </div>
              <Switch
                id="include-costs"
                checked={orchestrationConfig.includeCosts}
                onCheckedChange={(checked) => handleOrchestrationChange('includeCosts', checked)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-history">Max History Items</Label>
            <Input
              id="max-history"
              type="number"
              value={orchestrationConfig.maxHistoryItems}
              onChange={(event) =>
                handleOrchestrationChange('maxHistoryItems', parseInt(event.target.value, 10) || 0)
              }
              min={1}
              max={100}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of orchestration results to keep in history
            </p>
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <CheckCircle size={18} weight="bold" />
            Save Orchestration Settings
          </Button>
        </div>
      </Card>
    </div>
  )
}
