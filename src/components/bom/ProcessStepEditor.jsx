import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils.js'
import { Trash, ArrowRight, Thermometer, Clock, Warning, CheckCircle } from '@phosphor-icons/react'

export function ProcessStepEditor({ steps, selectedId, onSelect, onUpdate, onRemove }) {
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)
  const selectedStep = steps.find((step) => step.id === selectedId)

  const calculateYieldPercentage = (step) => {
    if (!step.yields) return null
    if (!step.yields.input) return 0
    return (step.yields.output / step.yields.input) * 100
  }

  const updateYield = (step, updates) => {
    const current = step.yields || { input: 0, output: 0, waste: 0, unit: 'kg' }
    const input = updates.input ?? current.input
    const output = updates.output ?? current.output

    onUpdate(step.id, {
      yields: {
        ...current,
        ...updates,
        input,
        output,
        waste: input - output,
      },
    })
  }

  return (
    <div className="space-y-4 p-4">
      {sortedSteps.map((step, index) => {
        const yieldPct = calculateYieldPercentage(step)
        const hasLowYield = yieldPct !== null && yieldPct < 90

        return (
          <div key={step.id} className="space-y-2">
            <div
              className={cn(
                'group p-3 rounded-lg border cursor-pointer transition-all hover:border-accent',
                selectedId === step.id ? 'border-primary bg-accent/30' : 'border-border bg-card'
              )}
              onClick={() => onSelect(step.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {step.order}
                  </Badge>
                  {index < sortedSteps.length - 1 && (
                    <ArrowRight size={16} className="text-muted-foreground rotate-90" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{step.name}</h4>
                    {yieldPct !== null && (
                      <Badge variant={hasLowYield ? 'destructive' : 'secondary'} className="text-xs">
                        {yieldPct.toFixed(1)}% yield
                      </Badge>
                    )}
                  </div>

                  {step.description && <p className="text-xs text-muted-foreground mb-2">{step.description}</p>}

                  <div className="flex flex-wrap gap-3 text-xs">
                    {step.duration > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock size={14} />
                        <span>
                          {step.duration} {step.durationUnit}
                        </span>
                      </div>
                    )}

                    {step.temperature !== undefined && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Thermometer size={14} />
                        <span>
                          {step.temperature}°{step.temperatureUnit || 'C'}
                        </span>
                      </div>
                    )}

                    {step.equipment && (
                      <Badge variant="outline" className="text-xs">
                        {step.equipment}
                      </Badge>
                    )}
                  </div>

                  {step.yields && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-muted-foreground">Input:</span>
                        <span className="ml-1 font-medium">
                          {step.yields.input} {step.yields.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output:</span>
                        <span className="ml-1 font-medium">
                          {step.yields.output} {step.yields.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Waste:</span>
                        <span className="ml-1 font-medium">
                          {(step.yields.waste ?? 0)} {step.yields.unit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove(step.id)
                  }}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </div>

            {selectedId === step.id && selectedStep && (
              <Card className="p-4 bg-accent/10 space-y-3">
                <h5 className="font-semibold text-sm">Edit Process Step</h5>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Step Name</Label>
                    <Input
                      value={step.name}
                      onChange={(event) => onUpdate(step.id, { name: event.target.value })}
                      className="h-8"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={step.description}
                      onChange={(event) => onUpdate(step.id, { description: event.target.value })}
                      className="h-8"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Duration</Label>
                    <Input
                      type="number"
                      value={step.duration}
                      onChange={(event) =>
                        onUpdate(step.id, { duration: parseFloat(event.target.value) || 0 })
                      }
                      className="h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Select
                      value={step.durationUnit}
                      onValueChange={(value) => onUpdate(step.id, { durationUnit: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Temperature (optional)</Label>
                    <Input
                      type="number"
                      value={step.temperature ?? ''}
                      onChange={(event) =>
                        onUpdate(step.id, {
                          temperature: event.target.value === '' ? undefined : parseFloat(event.target.value) || 0,
                        })
                      }
                      className="h-8"
                      placeholder="e.g., 80"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Equipment (optional)</Label>
                    <Input
                      value={step.equipment || ''}
                      onChange={(event) =>
                        onUpdate(step.id, { equipment: event.target.value || undefined })
                      }
                      className="h-8"
                      placeholder="e.g., Mixer"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <h6 className="font-semibold text-xs mb-2 flex items-center gap-2">
                    Yield Configuration
                    {step.yields && <CheckCircle size={14} className="text-green-500" weight="fill" />}
                  </h6>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Input Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={step.yields?.input ?? ''}
                        onChange={(event) =>
                          updateYield(step, { input: parseFloat(event.target.value) || 0 })
                        }
                        className="h-8"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Output Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={step.yields?.output ?? ''}
                        onChange={(event) =>
                          updateYield(step, { output: parseFloat(event.target.value) || 0 })
                        }
                        className="h-8"
                        placeholder="0"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Unit</Label>
                      <Select
                        value={step.yields?.unit || 'kg'}
                        onValueChange={(value) => updateYield(step, { unit: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="mL">mL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {step.yields && step.yields.input > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs flex items-center justify-between">
                      <span className="text-muted-foreground">Yield Efficiency:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {((step.yields.output / step.yields.input) * 100).toFixed(1)}%
                        </span>
                        {(step.yields.output / step.yields.input) * 100 < 90 && (
                          <Warning size={14} className="text-amber-500" weight="fill" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )
      })}

      {steps.length === 0 && (
        <div className="p-12 text-center">
          <ArrowRight size={48} className="mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No process steps yet</p>
          <p className="text-xs text-muted-foreground/70">Click + to add process steps</p>
        </div>
      )}
    </div>
  )
}
