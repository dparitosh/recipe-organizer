import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, Scales } from '@phosphor-icons/react';
import { calculateYield } from '@/lib/engines/yield';
import { calculateCost } from '@/lib/engines/cost';
import { scaleFormulation } from '@/lib/engines/scaling';

export const CalculationPanel = ({ formulation, onScaledFormulation }) => {
  const [yieldParams, setYieldParams] = useState({
    processLoss: 5,
    moistureContent: 0,
    evaporationRate: 0,
    wasteFactor: 2,
  });
  const [yieldResult, setYieldResult] = useState(null);

  const [costParams, setCostParams] = useState({
    overheadRate: 15,
    laborCostPerHour: 25,
    energyCostPerUnit: 0.12,
    packagingCost: 0.5,
    shippingCost: 0.3,
    markupPercentage: 30,
  });
  const [costResult, setCostResult] = useState(null);

  const [scaleTarget, setScaleTarget] = useState(100);
  const [scaleUnit, setScaleUnit] = useState('kg');

  const handleCalculateYield = () => {
    const result = calculateYield({
      formulation,
      parameters: yieldParams,
    });
    setYieldResult(result);
  };

  const handleCalculateCost = () => {
    const result = calculateCost({
      formulation,
      parameters: costParams,
    });
    setCostResult(result);
  };

  const handleScale = () => {
    const result = scaleFormulation({
      formulation,
      targetQuantity: scaleTarget,
      targetUnit: scaleUnit,
      options: { maintainRatios: true },
    });
    onScaledFormulation?.(result.scaledFormulation);
  };

  const totalPercentage = formulation.ingredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator size={24} />
          Calculation Engine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="yield">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="yield">Yield</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="scale">Scale</TabsTrigger>
          </TabsList>

          <TabsContent value="yield" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Process Loss (%)</Label>
                <Input
                  type="number"
                  value={yieldParams.processLoss}
                  onChange={(e) => setYieldParams({ ...yieldParams, processLoss: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Moisture Content (%)</Label>
                <Input
                  type="number"
                  value={yieldParams.moistureContent}
                  onChange={(e) => setYieldParams({ ...yieldParams, moistureContent: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Evaporation Rate (%)</Label>
                <Input
                  type="number"
                  value={yieldParams.evaporationRate}
                  onChange={(e) => setYieldParams({ ...yieldParams, evaporationRate: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Waste Factor (%)</Label>
                <Input
                  type="number"
                  value={yieldParams.wasteFactor}
                  onChange={(e) => setYieldParams({ ...yieldParams, wasteFactor: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <Button onClick={handleCalculateYield} className="w-full">
              Calculate Yield
            </Button>

            {yieldResult && (
              <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Theoretical Yield:</span>
                  <span className="font-semibold">
                    {yieldResult.theoreticalYield.toFixed(2)} {yieldResult.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Actual Yield:</span>
                  <span className="font-semibold">
                    {yieldResult.actualYield.toFixed(2)} {yieldResult.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Yield Percentage:</span>
                  <Badge variant={yieldResult.yieldPercentage > 90 ? 'default' : 'secondary'}>
                    {yieldResult.yieldPercentage.toFixed(1)}%
                  </Badge>
                </div>
                <Separator />
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Process Loss:</span>
                    <span>
                      {yieldResult.lossBreakdown.processLoss.toFixed(2)} {yieldResult.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moisture Loss:</span>
                    <span>
                      {yieldResult.lossBreakdown.moistureLoss.toFixed(2)} {yieldResult.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Loss:</span>
                    <span className="font-semibold">
                      {yieldResult.lossBreakdown.total.toFixed(2)} {yieldResult.unit}
                    </span>
                  </div>
                </div>
                {yieldResult.warnings.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      {yieldResult.warnings.map((warning, idx) => (
                        <p key={idx} className="text-xs text-orange-500">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Overhead Rate (%)</Label>
                <Input
                  type="number"
                  value={costParams.overheadRate}
                  onChange={(e) => setCostParams({ ...costParams, overheadRate: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Labor Cost ($/hr)</Label>
                <Input
                  type="number"
                  value={costParams.laborCostPerHour}
                  onChange={(e) => setCostParams({ ...costParams, laborCostPerHour: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Energy Cost ($/unit)</Label>
                <Input
                  type="number"
                  value={costParams.energyCostPerUnit}
                  onChange={(e) => setCostParams({ ...costParams, energyCostPerUnit: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Markup (%)</Label>
                <Input
                  type="number"
                  value={costParams.markupPercentage}
                  onChange={(e) => setCostParams({ ...costParams, markupPercentage: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <Button onClick={handleCalculateCost} className="w-full">
              Calculate Cost
            </Button>

            {costResult && (
              <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Cost:</span>
                  <span className="text-lg font-bold">${costResult.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cost Per Unit:</span>
                  <span className="font-semibold">${costResult.costPerUnit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target Price:</span>
                  <span className="font-semibold text-primary">
                    ${costResult.profitability.targetPrice?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Gross Margin:</span>
                  <Badge variant={costResult.profitability.grossMargin > 25 ? 'default' : 'secondary'}>
                    {costResult.profitability.grossMargin.toFixed(1)}%
                  </Badge>
                </div>
                <Separator />
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Raw Materials:</span>
                    <span>${costResult.breakdown.rawMaterials.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor:</span>
                    <span>${costResult.breakdown.labor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overhead:</span>
                    <span>${costResult.breakdown.overhead.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Packaging:</span>
                    <span>${costResult.breakdown.packaging.toFixed(2)}</span>
                  </div>
                </div>
                {costResult.warnings.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      {costResult.warnings.map((warning, idx) => (
                        <p key={idx} className="text-xs text-orange-500">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scale" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Quantity</Label>
                <Input
                  type="number"
                  value={scaleTarget}
                  onChange={(e) => setScaleTarget(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={scaleUnit} onChange={(e) => setScaleUnit(e.target.value)} />
              </div>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Yield:</span>
                <span className="font-semibold">
                  {formulation.targetYield} {formulation.yieldUnit}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Scale Factor:</span>
                <span className="font-semibold">
                  {(scaleTarget / formulation.targetYield).toFixed(2)}x
                </span>
              </div>
            </div>

            <Button onClick={handleScale} className="w-full">
              <Scales className="mr-2" size={18} />
              Scale Formulation
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CalculationPanel;
