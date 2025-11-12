import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function NutritionLabel({ nutritionFacts }) {
  if (!nutritionFacts) {
    return null
  }

  const { formulation_name, serving_size, serving_size_unit, servings_per_container, calories, nutrients } = nutritionFacts

  // Helper to format nutrient row
  const NutrientRow = ({ label, amount, unit, dailyValue, indent = 0, bold = false }) => (
    <div 
      className={`flex justify-between py-1 ${bold ? 'font-bold' : ''}`}
      style={{ paddingLeft: `${indent * 12}px` }}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <span>{amount}{unit}</span>
        {dailyValue !== null && dailyValue !== undefined && (
          <span className="font-bold min-w-[40px] text-right">{dailyValue}%</span>
        )}
      </span>
    </div>
  )

  return (
    <Card className="w-full max-w-md border-2 border-black font-sans">
      <CardHeader className="pb-2">
        <CardTitle className="text-3xl font-black">Nutrition Facts</CardTitle>
        <div className="text-sm">{formulation_name}</div>
        <Separator className="my-2 bg-black h-[8px]" />
        <div className="flex justify-between text-sm">
          <span>
            <span className="font-bold">Serving size</span> {serving_size}{serving_size_unit}
          </span>
          {servings_per_container && (
            <span>Servings: {servings_per_container}</span>
          )}
        </div>
        <Separator className="my-1 bg-black h-[2px]" />
      </CardHeader>

      <CardContent className="space-y-0 pt-0">
        {/* Calories */}
        <div className="flex justify-between items-baseline py-2">
          <span className="text-2xl font-black">Calories</span>
          <span className="text-3xl font-black">{calories}</span>
        </div>
        
        <Separator className="bg-black h-[5px]" />
        
        <div className="text-xs text-right py-1 font-bold">% Daily Value*</div>
        
        <Separator className="bg-black h-[1px]" />

        {/* Total Fat */}
        {nutrients.total_fat && (
          <>
            <NutrientRow
              label="Total Fat"
              amount={nutrients.total_fat.amount}
              unit={nutrients.total_fat.unit}
              dailyValue={nutrients.total_fat.daily_value_percent}
              bold
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Saturated Fat */}
        {nutrients.saturated_fat && (
          <>
            <NutrientRow
              label="Saturated Fat"
              amount={nutrients.saturated_fat.amount}
              unit={nutrients.saturated_fat.unit}
              dailyValue={nutrients.saturated_fat.daily_value_percent}
              indent={1}
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Trans Fat */}
        {nutrients.trans_fat && (
          <>
            <NutrientRow
              label="Trans Fat"
              amount={nutrients.trans_fat.amount}
              unit={nutrients.trans_fat.unit}
              dailyValue={nutrients.trans_fat.daily_value_percent}
              indent={1}
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Cholesterol */}
        {nutrients.cholesterol && (
          <>
            <NutrientRow
              label="Cholesterol"
              amount={nutrients.cholesterol.amount}
              unit={nutrients.cholesterol.unit}
              dailyValue={nutrients.cholesterol.daily_value_percent}
              bold
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Sodium */}
        {nutrients.sodium && (
          <>
            <NutrientRow
              label="Sodium"
              amount={nutrients.sodium.amount}
              unit={nutrients.sodium.unit}
              dailyValue={nutrients.sodium.daily_value_percent}
              bold
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Total Carbohydrate */}
        {nutrients.total_carbohydrate && (
          <>
            <NutrientRow
              label="Total Carbohydrate"
              amount={nutrients.total_carbohydrate.amount}
              unit={nutrients.total_carbohydrate.unit}
              dailyValue={nutrients.total_carbohydrate.daily_value_percent}
              bold
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Dietary Fiber */}
        {nutrients.dietary_fiber && (
          <>
            <NutrientRow
              label="Dietary Fiber"
              amount={nutrients.dietary_fiber.amount}
              unit={nutrients.dietary_fiber.unit}
              dailyValue={nutrients.dietary_fiber.daily_value_percent}
              indent={1}
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Total Sugars */}
        {nutrients.total_sugars && (
          <>
            <NutrientRow
              label="Total Sugars"
              amount={nutrients.total_sugars.amount}
              unit={nutrients.total_sugars.unit}
              dailyValue={nutrients.total_sugars.daily_value_percent}
              indent={1}
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Added Sugars */}
        {nutrients.added_sugars && nutrients.added_sugars.amount > 0 && (
          <>
            <NutrientRow
              label="Includes Added Sugars"
              amount={nutrients.added_sugars.amount}
              unit={nutrients.added_sugars.unit}
              dailyValue={nutrients.added_sugars.daily_value_percent}
              indent={2}
            />
            <Separator className="bg-gray-400 h-[1px]" />
          </>
        )}

        {/* Protein */}
        {nutrients.protein && (
          <>
            <NutrientRow
              label="Protein"
              amount={nutrients.protein.amount}
              unit={nutrients.protein.unit}
              dailyValue={nutrients.protein.daily_value_percent}
              bold
            />
            <Separator className="bg-black h-[8px]" />
          </>
        )}

        {/* Micronutrients */}
        <div className="space-y-1 py-1">
          {nutrients.vitamin_d && nutrients.vitamin_d.amount > 0 && (
            <NutrientRow
              label="Vitamin D"
              amount={nutrients.vitamin_d.amount}
              unit={nutrients.vitamin_d.unit}
              dailyValue={nutrients.vitamin_d.daily_value_percent}
            />
          )}
          {nutrients.calcium && nutrients.calcium.amount > 0 && (
            <NutrientRow
              label="Calcium"
              amount={nutrients.calcium.amount}
              unit={nutrients.calcium.unit}
              dailyValue={nutrients.calcium.daily_value_percent}
            />
          )}
          {nutrients.iron && nutrients.iron.amount > 0 && (
            <NutrientRow
              label="Iron"
              amount={nutrients.iron.amount}
              unit={nutrients.iron.unit}
              dailyValue={nutrients.iron.daily_value_percent}
            />
          )}
          {nutrients.potassium && nutrients.potassium.amount > 0 && (
            <NutrientRow
              label="Potassium"
              amount={nutrients.potassium.amount}
              unit={nutrients.potassium.unit}
              dailyValue={nutrients.potassium.daily_value_percent}
            />
          )}
        </div>

        <Separator className="bg-black h-[1px]" />

        {/* Footer */}
        <div className="text-xs pt-2 text-muted-foreground">
          * Percent Daily Values are based on a 2,000 calorie diet. Your daily values may be higher or lower depending on your calorie needs.
        </div>
      </CardContent>
    </Card>
  )
}
