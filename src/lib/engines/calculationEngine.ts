import { Formulation, Ingredient, NutrientProfile } from '@/lib/schemas/formulation'
import { BOM, ProcessStep } from '@/lib/schemas/bom'
import { scaleFormulation, convertUnits } from './scaling'
import { calculateYield, YieldParameters, LossBreakdown } from './yield'
import { calculateCost, CostParameters, CostBreakdown } from './cost'
import { calculateByproducts, Byproduct } from './byproduct'

export interface CalculationEngineRequest {
  formulation: Formulation
  bom?: BOM
  targetBatchSize: number
  targetUnit: string
  yieldPercentage: number
  lossModels?: LossModel[]
  densityMap?: DensityMap
  plantConstraints?: PlantConstraints
  costParameters?: CostParameters
}

export interface LossModel {
  stepName: string
  lossType: 'process' | 'evaporation' | 'moisture' | 'waste' | 'transfer'
  lossPercentage: number
  description?: string
}

export interface DensityMap {
  [materialName: string]: MaterialDensity
}

export interface MaterialDensity {
  density: number
  unit: 'kg/L' | 'g/mL' | 'lb/gal'
  temperature?: number
  conditions?: string
}

export interface PlantConstraints {
  roundingRules: RoundingRule[]
  minBatchSize?: number
  maxBatchSize?: number
  equipmentCapacity?: Record<string, number>
  processingTime?: Record<string, number>
}

export interface RoundingRule {
  ingredientPattern?: string
  minQuantity: number
  roundToNearest: number
  unit: string
}

export interface CalculationEngineResult {
  scaledIngredients: ScaledIngredient[]
  byproducts: Byproduct[]
  aggregatedNutrition: NutrientProfile
  costRollup: CostRollup
  yieldChain: YieldChainStep[]
  totalOutput: number
  outputUnit: string
  warnings: string[]
  metadata: CalculationMetadata
}

export interface ScaledIngredient extends Ingredient {
  originalQuantity: number
  scaledQuantity: number
  roundedQuantity: number
  volumeEquivalent?: number
  densityUsed?: number
  scaleFactor: number
}

export interface CostRollup {
  totalCost: number
  costPerUnit: number
  costPerBatch: number
  breakdown: CostBreakdown
  byproductValue: number
  netCost: number
}

export interface YieldChainStep {
  stepName: string
  stepIndex: number
  inputQuantity: number
  outputQuantity: number
  lossQuantity: number
  lossPercentage: number
  yieldPercentage: number
  cumulativeYield: number
  lossType: string
}

export interface CalculationMetadata {
  calculatedAt: Date
  baseYield: number
  targetYield: number
  scaleFactor: number
  actualYieldPercentage: number
  efficiencyScore: number
}

export class CalculationEngine {
  private densityMap: DensityMap
  private plantConstraints: PlantConstraints
  
  constructor(densityMap?: DensityMap, plantConstraints?: PlantConstraints) {
    this.densityMap = densityMap || this.getDefaultDensityMap()
    this.plantConstraints = plantConstraints || this.getDefaultPlantConstraints()
  }
  
  calculate(request: CalculationEngineRequest): CalculationEngineResult {
    const warnings: string[] = []
    
    const baseYield = request.formulation.targetYield
    const scaleFactor = request.targetBatchSize / baseYield
    
    const yieldChain = this.computeYieldChain(
      request.formulation,
      request.bom,
      request.lossModels || [],
      request.yieldPercentage
    )
    
    const scaledIngredients = this.scaleIngredientsWithDensity(
      request.formulation.ingredients,
      scaleFactor,
      request.targetUnit,
      request.formulation.yieldUnit
    )
    
    const roundedIngredients = this.applyPlantConstraints(
      scaledIngredients,
      this.plantConstraints
    )
    
    const byproducts = this.calculateByproductsFromChain(
      yieldChain,
      request.formulation,
      request.bom
    )
    
    const aggregatedNutrition = this.aggregateNutrition(roundedIngredients)
    
    const costRollup = this.calculateCostRollup(
      roundedIngredients,
      request.formulation,
      request.bom,
      request.costParameters,
      byproducts
    )
    
    const finalYield = yieldChain[yieldChain.length - 1]
    const totalOutput = finalYield?.outputQuantity || request.targetBatchSize
    
    const actualYieldPercentage = (totalOutput / request.targetBatchSize) * 100
    const efficiencyScore = this.calculateEfficiencyScore(
      actualYieldPercentage,
      costRollup.costPerUnit,
      warnings.length
    )
    
    if (actualYieldPercentage < 80) {
      warnings.push(`Actual yield (${actualYieldPercentage.toFixed(1)}%) is below target - significant losses detected`)
    }
    
    if (scaleFactor > 100) {
      warnings.push(`Scale factor (${scaleFactor.toFixed(1)}x) is very large - consider multiple batches`)
    }
    
    if (scaleFactor < 0.1) {
      warnings.push(`Scale factor (${scaleFactor.toFixed(3)}x) is very small - precision may be compromised`)
    }
    
    return {
      scaledIngredients: roundedIngredients,
      byproducts,
      aggregatedNutrition,
      costRollup,
      yieldChain,
      totalOutput,
      outputUnit: request.targetUnit,
      warnings,
      metadata: {
        calculatedAt: new Date(),
        baseYield,
        targetYield: request.targetBatchSize,
        scaleFactor,
        actualYieldPercentage,
        efficiencyScore
      }
    }
  }
  
  private scaleIngredientsWithDensity(
    ingredients: Ingredient[],
    scaleFactor: number,
    targetUnit: string,
    baseUnit: string
  ): ScaledIngredient[] {
    return ingredients.map(ing => {
      const originalQuantity = ing.quantity
      let scaledQuantity = originalQuantity * scaleFactor
      
      if (this.needsUnitConversion(ing.unit, targetUnit)) {
        const density = this.getDensityForMaterial(ing.name, ing.unit, targetUnit)
        scaledQuantity = this.convertMassToVolume(scaledQuantity, ing.unit, targetUnit, density)
      }
      
      return {
        ...ing,
        originalQuantity,
        scaledQuantity,
        roundedQuantity: scaledQuantity,
        densityUsed: this.densityMap[ing.name]?.density,
        scaleFactor
      }
    })
  }
  
  private needsUnitConversion(fromUnit: string, toUnit: string): boolean {
    const massUnits = ['kg', 'g', 'lb', 'oz']
    const volumeUnits = ['L', 'ml', 'gal', 'fl_oz']
    
    const fromIsMass = massUnits.includes(fromUnit)
    const toIsVolume = volumeUnits.includes(toUnit)
    const fromIsVolume = volumeUnits.includes(fromUnit)
    const toIsMass = massUnits.includes(toUnit)
    
    return (fromIsMass && toIsVolume) || (fromIsVolume && toIsMass)
  }
  
  private convertMassToVolume(
    value: number,
    fromUnit: string,
    toUnit: string,
    density: number
  ): number {
    const massUnits = ['kg', 'g', 'lb', 'oz']
    const volumeUnits = ['L', 'ml', 'gal', 'fl_oz']
    
    const isMassToVolume = massUnits.includes(fromUnit) && volumeUnits.includes(toUnit)
    const isVolumeToMass = volumeUnits.includes(fromUnit) && massUnits.includes(toUnit)
    
    if (isMassToVolume) {
      const massInKg = this.normalizeToKg(value, fromUnit)
      const volumeInL = massInKg / density
      return this.convertFromLiters(volumeInL, toUnit)
    } else if (isVolumeToMass) {
      const volumeInL = this.normalizeToLiters(value, fromUnit)
      const massInKg = volumeInL * density
      return this.convertFromKg(massInKg, toUnit)
    }
    
    return convertUnits(value, fromUnit, toUnit)
  }
  
  private normalizeToKg(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      kg: 1,
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495
    }
    return value * (conversions[unit] || 1)
  }
  
  private convertFromKg(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      kg: 1,
      g: 1000,
      lb: 2.20462,
      oz: 35.274
    }
    return value * (conversions[unit] || 1)
  }
  
  private normalizeToLiters(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      L: 1,
      ml: 0.001,
      gal: 3.78541,
      fl_oz: 0.0295735
    }
    return value * (conversions[unit] || 1)
  }
  
  private convertFromLiters(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      L: 1,
      ml: 1000,
      gal: 0.264172,
      fl_oz: 33.814
    }
    return value * (conversions[unit] || 1)
  }
  
  private getDensityForMaterial(materialName: string, fromUnit: string, toUnit: string): number {
    const materialData = this.densityMap[materialName.toLowerCase()]
    
    if (materialData) {
      return this.normalizeDensityToKgPerL(materialData.density, materialData.unit)
    }
    
    return 1.0
  }
  
  private normalizeDensityToKgPerL(density: number, unit: string): number {
    if (unit === 'kg/L') return density
    if (unit === 'g/mL') return density
    if (unit === 'lb/gal') return density * 0.119826
    return density
  }
  
  private applyPlantConstraints(
    ingredients: ScaledIngredient[],
    constraints: PlantConstraints
  ): ScaledIngredient[] {
    return ingredients.map(ing => {
      const roundedQuantity = this.applyRoundingRules(ing, constraints.roundingRules)
      
      return {
        ...ing,
        roundedQuantity,
        quantity: roundedQuantity
      }
    })
  }
  
  private applyRoundingRules(ingredient: ScaledIngredient, rules: RoundingRule[]): number {
    let applicableRule: RoundingRule | undefined
    
    for (const rule of rules) {
      if (!rule.ingredientPattern || 
          ingredient.name.toLowerCase().includes(rule.ingredientPattern.toLowerCase())) {
        if (ingredient.scaledQuantity >= rule.minQuantity) {
          applicableRule = rule
          break
        }
      }
    }
    
    if (!applicableRule) {
      applicableRule = rules.find(r => !r.ingredientPattern && ingredient.scaledQuantity >= r.minQuantity)
    }
    
    if (applicableRule) {
      const rounded = Math.round(ingredient.scaledQuantity / applicableRule.roundToNearest) * applicableRule.roundToNearest
      return Math.max(rounded, applicableRule.roundToNearest)
    }
    
    if (ingredient.scaledQuantity < 1) {
      return Math.round(ingredient.scaledQuantity * 100) / 100
    } else if (ingredient.scaledQuantity < 10) {
      return Math.round(ingredient.scaledQuantity * 10) / 10
    } else {
      return Math.round(ingredient.scaledQuantity)
    }
  }
  
  private computeYieldChain(
    formulation: Formulation,
    bom: BOM | undefined,
    lossModels: LossModel[],
    targetYieldPercentage: number
  ): YieldChainStep[] {
    const chain: YieldChainStep[] = []
    const totalInput = formulation.ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
    
    let currentQuantity = totalInput
    let cumulativeYield = 100
    
    chain.push({
      stepName: 'Initial Input',
      stepIndex: 0,
      inputQuantity: 0,
      outputQuantity: totalInput,
      lossQuantity: 0,
      lossPercentage: 0,
      yieldPercentage: 100,
      cumulativeYield: 100,
      lossType: 'none'
    })
    
    if (bom && bom.process) {
      bom.process.forEach((step, idx) => {
        const stepLossModel = lossModels.find(lm => 
          lm.stepName.toLowerCase() === step.name.toLowerCase()
        )
        
        const lossPercentage = stepLossModel?.lossPercentage || 
                               (step.yields ? ((step.yields.input - step.yields.output) / step.yields.input * 100) : 0)
        
        const lossQuantity = currentQuantity * (lossPercentage / 100)
        const outputQuantity = currentQuantity - lossQuantity
        const yieldPercentage = (outputQuantity / currentQuantity) * 100
        cumulativeYield *= (yieldPercentage / 100)
        
        chain.push({
          stepName: step.name,
          stepIndex: idx + 1,
          inputQuantity: currentQuantity,
          outputQuantity,
          lossQuantity,
          lossPercentage,
          yieldPercentage,
          cumulativeYield,
          lossType: stepLossModel?.lossType || 'process'
        })
        
        currentQuantity = outputQuantity
      })
    }
    
    const additionalLosses = lossModels.filter(lm => 
      !bom?.process.some(step => step.name.toLowerCase() === lm.stepName.toLowerCase())
    )
    
    additionalLosses.forEach((loss, idx) => {
      const lossQuantity = currentQuantity * (loss.lossPercentage / 100)
      const outputQuantity = currentQuantity - lossQuantity
      const yieldPercentage = (outputQuantity / currentQuantity) * 100
      cumulativeYield *= (yieldPercentage / 100)
      
      chain.push({
        stepName: loss.stepName,
        stepIndex: (bom?.process.length || 0) + idx + 1,
        inputQuantity: currentQuantity,
        outputQuantity,
        lossQuantity,
        lossPercentage: loss.lossPercentage,
        yieldPercentage,
        cumulativeYield,
        lossType: loss.lossType
      })
      
      currentQuantity = outputQuantity
    })
    
    if (targetYieldPercentage < 100 && targetYieldPercentage !== cumulativeYield) {
      const targetAdjustmentLoss = 100 - targetYieldPercentage
      const adjustmentQuantity = totalInput * (targetAdjustmentLoss / 100)
      
      chain.push({
        stepName: 'Target Yield Adjustment',
        stepIndex: chain.length,
        inputQuantity: totalInput,
        outputQuantity: totalInput * (targetYieldPercentage / 100),
        lossQuantity: adjustmentQuantity,
        lossPercentage: targetAdjustmentLoss,
        yieldPercentage: targetYieldPercentage,
        cumulativeYield: targetYieldPercentage,
        lossType: 'adjustment'
      })
    }
    
    return chain
  }
  
  private calculateByproductsFromChain(
    yieldChain: YieldChainStep[],
    formulation: Formulation,
    bom?: BOM
  ): Byproduct[] {
    const byproducts: Byproduct[] = []
    
    yieldChain.forEach((step, idx) => {
      if (step.lossQuantity > 0 && step.stepName !== 'Initial Input') {
        byproducts.push({
          id: `byproduct-${idx}`,
          name: `${step.stepName} Loss`,
          quantity: step.lossQuantity,
          unit: formulation.yieldUnit,
          source: step.stepName,
          category: this.categorizeByproductType(step.lossType),
          recoveryMethod: this.suggestRecoveryMethod(step.lossType, step.stepName)
        })
      }
    })
    
    if (bom) {
      const bomByproducts = calculateByproducts(formulation, bom.process)
      byproducts.push(...bomByproducts.byproducts)
    }
    
    return byproducts
  }
  
  private categorizeByproductType(lossType: string): Byproduct['category'] {
    switch (lossType) {
      case 'evaporation':
      case 'moisture':
        return 'waste'
      case 'process':
      case 'transfer':
        return 'recyclable'
      case 'waste':
        return 'waste'
      default:
        return 'waste'
    }
  }
  
  private suggestRecoveryMethod(lossType: string, stepName: string): string | undefined {
    if (lossType === 'evaporation') {
      return 'Condenser recovery system'
    }
    if (lossType === 'process' && stepName.toLowerCase().includes('filter')) {
      return 'Composting or secondary extraction'
    }
    if (lossType === 'transfer') {
      return 'Equipment optimization and line flushing'
    }
    return undefined
  }
  
  private aggregateNutrition(ingredients: ScaledIngredient[]): NutrientProfile {
    const aggregated: NutrientProfile = {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: {},
      minerals: {}
    }
    
    let totalQuantity = 0
    
    ingredients.forEach(ing => {
      if (ing.nutrients) {
        const scaleFactor = ing.roundedQuantity / 100
        
        aggregated.calories! += (ing.nutrients.calories || 0) * scaleFactor
        aggregated.protein! += (ing.nutrients.protein || 0) * scaleFactor
        aggregated.carbohydrates! += (ing.nutrients.carbohydrates || 0) * scaleFactor
        aggregated.fat! += (ing.nutrients.fat || 0) * scaleFactor
        aggregated.fiber! += (ing.nutrients.fiber || 0) * scaleFactor
        aggregated.sugar! += (ing.nutrients.sugar || 0) * scaleFactor
        aggregated.sodium! += (ing.nutrients.sodium || 0) * scaleFactor
        
        if (ing.nutrients.vitamins) {
          Object.entries(ing.nutrients.vitamins).forEach(([vitamin, value]) => {
            aggregated.vitamins![vitamin] = (aggregated.vitamins![vitamin] || 0) + value * scaleFactor
          })
        }
        
        if (ing.nutrients.minerals) {
          Object.entries(ing.nutrients.minerals).forEach(([mineral, value]) => {
            aggregated.minerals![mineral] = (aggregated.minerals![mineral] || 0) + value * scaleFactor
          })
        }
      }
      
      totalQuantity += ing.roundedQuantity
    })
    
    if (totalQuantity > 100) {
      const normalizationFactor = 100 / totalQuantity
      
      aggregated.calories = (aggregated.calories || 0) * normalizationFactor
      aggregated.protein = (aggregated.protein || 0) * normalizationFactor
      aggregated.carbohydrates = (aggregated.carbohydrates || 0) * normalizationFactor
      aggregated.fat = (aggregated.fat || 0) * normalizationFactor
      aggregated.fiber = (aggregated.fiber || 0) * normalizationFactor
      aggregated.sugar = (aggregated.sugar || 0) * normalizationFactor
      aggregated.sodium = (aggregated.sodium || 0) * normalizationFactor
      
      Object.keys(aggregated.vitamins!).forEach(vitamin => {
        aggregated.vitamins![vitamin] *= normalizationFactor
      })
      
      Object.keys(aggregated.minerals!).forEach(mineral => {
        aggregated.minerals![mineral] *= normalizationFactor
      })
    }
    
    return aggregated
  }
  
  private calculateCostRollup(
    ingredients: ScaledIngredient[],
    formulation: Formulation,
    bom: BOM | undefined,
    costParameters: CostParameters | undefined,
    byproducts: Byproduct[]
  ): CostRollup {
    const tempFormulation: Formulation = {
      ...formulation,
      ingredients: ingredients.map(ing => ({
        ...ing,
        quantity: ing.roundedQuantity
      }))
    }
    
    const costResult = calculateCost({
      formulation: tempFormulation,
      bom,
      parameters: costParameters || {}
    })
    
    const byproductValue = byproducts.reduce((sum, bp) => sum + (bp.value || 0), 0)
    const netCost = costResult.totalCost - byproductValue
    
    return {
      totalCost: costResult.totalCost,
      costPerUnit: costResult.costPerUnit,
      costPerBatch: costResult.totalCost,
      breakdown: costResult.breakdown,
      byproductValue,
      netCost
    }
  }
  
  private calculateEfficiencyScore(
    yieldPercentage: number,
    costPerUnit: number,
    warningCount: number
  ): number {
    const yieldScore = yieldPercentage / 100
    const costScore = Math.min(1, 1 / (costPerUnit + 1))
    const warningPenalty = Math.max(0, 1 - (warningCount * 0.1))
    
    return Math.round((yieldScore * 0.5 + costScore * 0.3 + warningPenalty * 0.2) * 100)
  }
  
  private getDefaultDensityMap(): DensityMap {
    return {
      'water': { density: 1.0, unit: 'kg/L' },
      'sugar': { density: 1.59, unit: 'kg/L' },
      'salt': { density: 2.16, unit: 'kg/L' },
      'flour': { density: 0.593, unit: 'kg/L' },
      'milk': { density: 1.03, unit: 'kg/L' },
      'oil': { density: 0.92, unit: 'kg/L' },
      'honey': { density: 1.42, unit: 'kg/L' },
      'corn syrup': { density: 1.37, unit: 'kg/L' },
      'citric acid': { density: 1.54, unit: 'kg/L' },
      'vanilla extract': { density: 0.88, unit: 'kg/L' },
      'butter': { density: 0.911, unit: 'kg/L' },
      'cream': { density: 1.01, unit: 'kg/L' }
    }
  }
  
  private getDefaultPlantConstraints(): PlantConstraints {
    return {
      roundingRules: [
        { minQuantity: 100, roundToNearest: 10, unit: 'kg' },
        { minQuantity: 10, roundToNearest: 1, unit: 'kg' },
        { minQuantity: 1, roundToNearest: 0.1, unit: 'kg' },
        { minQuantity: 0.1, roundToNearest: 0.01, unit: 'kg' },
        { minQuantity: 100, roundToNearest: 10, unit: 'L' },
        { minQuantity: 10, roundToNearest: 1, unit: 'L' },
        { minQuantity: 1, roundToNearest: 0.1, unit: 'L' }
      ],
      minBatchSize: 10,
      maxBatchSize: 10000
    }
  }
  
  setDensity(materialName: string, density: MaterialDensity): void {
    this.densityMap[materialName.toLowerCase()] = density
  }
  
  setPlantConstraints(constraints: PlantConstraints): void {
    this.plantConstraints = constraints
  }
  
  getDensity(materialName: string): MaterialDensity | undefined {
    return this.densityMap[materialName.toLowerCase()]
  }
}

export function createCalculationEngine(
  densityMap?: DensityMap,
  plantConstraints?: PlantConstraints
): CalculationEngine {
  return new CalculationEngine(densityMap, plantConstraints)
}

export function batchCalculate(
  engine: CalculationEngine,
  requests: CalculationEngineRequest[]
): CalculationEngineResult[] {
  return requests.map(req => engine.calculate(req))
}

export function compareCalculations(results: CalculationEngineResult[]): CalculationComparison {
  if (results.length === 0) {
    return {
      mostEfficient: null,
      leastEfficient: null,
      averageEfficiency: 0,
      totalCostRange: { min: 0, max: 0 },
      yieldRange: { min: 0, max: 0 }
    }
  }
  
  const sorted = [...results].sort((a, b) => 
    b.metadata.efficiencyScore - a.metadata.efficiencyScore
  )
  
  const efficiencies = results.map(r => r.metadata.efficiencyScore)
  const averageEfficiency = efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length
  
  const costs = results.map(r => r.costRollup.totalCost)
  const yields = results.map(r => r.metadata.actualYieldPercentage)
  
  return {
    mostEfficient: sorted[0],
    leastEfficient: sorted[sorted.length - 1],
    averageEfficiency,
    totalCostRange: {
      min: Math.min(...costs),
      max: Math.max(...costs)
    },
    yieldRange: {
      min: Math.min(...yields),
      max: Math.max(...yields)
    }
  }
}

export interface CalculationComparison {
  mostEfficient: CalculationEngineResult | null
  leastEfficient: CalculationEngineResult | null
  averageEfficiency: number
  totalCostRange: { min: number; max: number }
  yieldRange: { min: number; max: number }
}
