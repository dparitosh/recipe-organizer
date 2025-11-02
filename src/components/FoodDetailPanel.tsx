import { FoodNode } from '@/lib/types'
import { getMainNutrients, FOOD_CATEGORIES } from '@/lib/foodData'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash, ChartBar } from '@phosphor-icons/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FoodDetailPanelProps {
  node: FoodNode
  allNodes: FoodNode[]
  onDelete: (nodeId: string) => void
  onCompare: (node1Id: string, node2Id: string) => void
}

export function FoodDetailPanel({ node, allNodes, onDelete, onCompare }: FoodDetailPanelProps) {
  const { foodData, category } = node
  const mainNutrients = getMainNutrients(foodData)
  
  const otherNodes = allNodes.filter(n => n.id !== node.id)

  const formatValue = (value: number | undefined, unit: string = 'g'): string => {
    if (value === undefined) return 'N/A'
    return `${value.toFixed(1)} ${unit}`
  }

  const categoryInfo = FOOD_CATEGORIES[category as keyof typeof FOOD_CATEGORIES]

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-xl font-semibold leading-tight">
            {foodData.description}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(node.id)}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash size={18} />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge style={{ backgroundColor: node.color }} className="text-white">
            {categoryInfo?.name || category}
          </Badge>
          <Badge variant="outline">{foodData.dataType}</Badge>
          <Badge variant="secondary" className="text-xs">
            FDC ID: {foodData.fdcId}
          </Badge>
        </div>

        {foodData.servingSize && (
          <p className="text-sm text-muted-foreground mt-3">
            Serving Size: {foodData.servingSize} {foodData.servingSizeUnit}
          </p>
        )}

        {foodData.brandOwner && (
          <p className="text-sm text-muted-foreground">
            Brand: {foodData.brandOwner}
          </p>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Macronutrients
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Calories</span>
            <span className="font-medium tabular-nums">
              {mainNutrients.calories ? 
                formatValue(mainNutrients.calories.value, mainNutrients.calories.unitName) : 
                'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Protein</span>
            <span className="font-medium tabular-nums">
              {mainNutrients.protein ? 
                formatValue(mainNutrients.protein.value, mainNutrients.protein.unitName) : 
                'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Carbohydrates</span>
            <span className="font-medium tabular-nums">
              {mainNutrients.carbs ? 
                formatValue(mainNutrients.carbs.value, mainNutrients.carbs.unitName) : 
                'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between items-center pl-4 text-muted-foreground">
            <span className="text-sm">Fiber</span>
            <span className="font-medium tabular-nums text-sm">
              {mainNutrients.fiber ? 
                formatValue(mainNutrients.fiber.value, mainNutrients.fiber.unitName) : 
                'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between items-center pl-4 text-muted-foreground">
            <span className="text-sm">Sugars</span>
            <span className="font-medium tabular-nums text-sm">
              {mainNutrients.sugar ? 
                formatValue(mainNutrients.sugar.value, mainNutrients.sugar.unitName) : 
                'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Total Fat</span>
            <span className="font-medium tabular-nums">
              {mainNutrients.fat ? 
                formatValue(mainNutrients.fat.value, mainNutrients.fat.unitName) : 
                'N/A'
              }
            </span>
          </div>
        </div>
      </div>

      {otherNodes.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Compare With
            </h3>
            <Select onValueChange={(value) => onCompare(node.id, value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a food to compare..." />
              </SelectTrigger>
              <SelectContent>
                {otherNodes.map((otherNode) => (
                  <SelectItem key={otherNode.id} value={otherNode.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: otherNode.color }}
                      />
                      <span className="truncate">{otherNode.foodData.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <Separator />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          All Nutrients ({foodData.foodNutrients?.length || 0})
        </h3>
        <ScrollArea className="h-64">
          <div className="space-y-2 pr-4">
            {foodData.foodNutrients?.map((nutrient, index) => (
              <div key={index} className="flex justify-between items-start text-sm">
                <span className="text-muted-foreground">{nutrient.nutrientName}</span>
                <span className="font-medium tabular-nums ml-2 text-right">
                  {formatValue(nutrient.value, nutrient.unitName)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {foodData.ingredients && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Ingredients
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {foodData.ingredients}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
