import { BOM } from '@/lib/schemas/bom'
import { CalculationResult } from './BOMConfigurator'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  ChartPie, 
  Warning, 
  TrendUp, 
  CurrencyDollar,
  Package,
  Scales,
  CheckCircle
} from '@phosphor-icons/react'

interface CalculationSummaryProps {
  result: CalculationResult | null
  bom: BOM
}

export function CalculationSummary({ result, bom }: CalculationSummaryProps) {
  if (!result) {
    return (
      <div className="p-12 text-center">
        <ChartPie size={64} className="mx-auto mb-4 text-muted-foreground/50" />
        <h4 className="font-semibold text-lg mb-2">No Calculation Results</h4>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Configure your BOM components and process steps, then click Calculate to see the results
        </p>
      </div>
    )
  }

  const totalInput = bom.components.reduce((sum, comp) => sum + comp.quantity, 0)

  return (
    <div className="p-4 space-y-6">
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <TrendUp size={18} className="text-green-500" />
          Overall Yield
        </h4>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {result.totalYield.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.actualOutput.toFixed(2)} {bom.batchUnit} from {totalInput.toFixed(2)} {bom.batchUnit}
              </p>
            </div>
            <CheckCircle size={32} className="text-green-500" weight="fill" />
          </div>

          <Progress value={result.totalYield} className="h-2 mt-3" />
        </Card>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <CurrencyDollar size={18} className="text-primary" />
          Cost Breakdown
        </h4>

        <div className="space-y-3">
          <Card className="p-3 bg-card/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Material Cost</span>
              <span className="font-semibold">${result.costBreakdown.materialCost.toFixed(2)}</span>
            </div>
            <Progress 
              value={(result.costBreakdown.materialCost / result.costBreakdown.totalCost) * 100} 
              className="h-1.5"
            />
          </Card>

          <Card className="p-3 bg-card/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Processing Cost</span>
              <span className="font-semibold">${result.costBreakdown.processingCost.toFixed(2)}</span>
            </div>
            <Progress 
              value={(result.costBreakdown.processingCost / result.costBreakdown.totalCost) * 100} 
              className="h-1.5"
            />
          </Card>

          <Card className="p-3 bg-card/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Overhead Cost</span>
              <span className="font-semibold">${result.costBreakdown.overheadCost.toFixed(2)}</span>
            </div>
            <Progress 
              value={(result.costBreakdown.overheadCost / result.costBreakdown.totalCost) * 100} 
              className="h-1.5"
            />
          </Card>

          <Card className="p-4 bg-primary/10 border-primary/30">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">Total Cost</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${result.costBreakdown.costPerUnit.toFixed(2)} per {bom.batchUnit}
                </p>
              </div>
              <p className="text-2xl font-bold text-primary">
                ${result.costBreakdown.totalCost.toFixed(2)}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Scales size={18} className="text-amber-500" />
          Waste & Byproducts
        </h4>

        <Card className="p-4 bg-amber-500/5 border-amber-500/20 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warning size={20} className="text-amber-500" weight="fill" />
              <div>
                <p className="font-semibold text-sm">Total Waste</p>
                <p className="text-xs text-muted-foreground">
                  {((result.totalWaste / totalInput) * 100).toFixed(1)}% of input
                </p>
              </div>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {result.totalWaste.toFixed(2)} {bom.batchUnit}
            </p>
          </div>
        </Card>

        {result.byproducts && result.byproducts.length > 0 && (
          <div className="space-y-2">
            {result.byproducts.map((byproduct) => (
              <Card key={byproduct.id} className="p-3 bg-card/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{byproduct.name}</p>
                      {byproduct.value !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Value: ${byproduct.value.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {byproduct.quantity.toFixed(2)} {byproduct.unit}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {result.warnings && result.warnings.length > 0 && (
        <>
          <Separator />

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Warning size={18} weight="fill" />
              Warnings
            </h4>

            <div className="space-y-2">
              {result.warnings.map((warning, idx) => (
                <Card key={idx} className="p-3 bg-amber-500/10 border-amber-500/30">
                  <p className="text-sm text-amber-600 dark:text-amber-400">{warning}</p>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-3 text-xs">
        <Card className="p-3">
          <p className="text-muted-foreground mb-1">Batch Size</p>
          <p className="font-semibold text-lg">{bom.batchSize} {bom.batchUnit}</p>
        </Card>

        <Card className="p-3">
          <p className="text-muted-foreground mb-1">Components</p>
          <p className="font-semibold text-lg">{bom.components.length}</p>
        </Card>

        <Card className="p-3">
          <p className="text-muted-foreground mb-1">Process Steps</p>
          <p className="font-semibold text-lg">{bom.process.length}</p>
        </Card>

        <Card className="p-3">
          <p className="text-muted-foreground mb-1">Lead Time</p>
          <p className="font-semibold text-lg">{bom.leadTime.toFixed(1)} days</p>
        </Card>
      </div>

      <Card className="p-4 bg-muted/50">
        <h5 className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wide">
          BOM Summary
        </h5>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">BOM ID:</span>
            <span className="font-mono">{bom.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Formulation:</span>
            <span className="font-mono">{bom.formulationId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revision:</span>
            <span className="font-semibold">{bom.metadata.revisionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Site:</span>
            <span>{bom.metadata.productionSite || 'Not specified'}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
