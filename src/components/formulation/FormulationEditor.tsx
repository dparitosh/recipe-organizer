import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash, Percent } from '@phosphor-icons/react'
import { Formulation, Ingredient, INGREDIENT_FUNCTIONS } from '@/lib/schemas/formulation'
import { ScrollArea } from '@/components/ui/scroll-area'

interface FormulationEditorProps {
  formulation: Formulation
  onChange: (formulation: Formulation) => void
}

export function FormulationEditor({ formulation, onChange }: FormulationEditorProps) {
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    function: 'base'
  })

  const totalPercentage = formulation.ingredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0)

  const handleFormulationChange = (field: keyof Formulation, value: any) => {
    onChange({
      ...formulation,
      [field]: value,
      updatedAt: new Date()
    })
  }

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...formulation.ingredients]
    updated[index] = { ...updated[index], [field]: value }
    handleFormulationChange('ingredients', updated)
  }

  const addIngredient = () => {
    if (!newIngredient.name || !newIngredient.quantity) return

    const ingredient: Ingredient = {
      id: `ing-${Date.now()}`,
      materialId: newIngredient.materialId || `MAT-${Date.now()}`,
      name: newIngredient.name,
      quantity: newIngredient.quantity || 0,
      unit: newIngredient.unit || 'kg',
      percentage: newIngredient.percentage || 0,
      function: newIngredient.function || 'other'
    }

    handleFormulationChange('ingredients', [...formulation.ingredients, ingredient])
    setNewIngredient({ function: 'base' })
  }

  const removeIngredient = (index: number) => {
    const updated = formulation.ingredients.filter((_, i) => i !== index)
    handleFormulationChange('ingredients', updated)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Formulation Editor</span>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant={Math.abs(totalPercentage - 100) < 0.1 ? 'default' : 'destructive'}>
              <Percent className="mr-1" size={14} />
              {totalPercentage.toFixed(2)}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="formula-name">Name</Label>
            <Input
              id="formula-name"
              value={formulation.name}
              onChange={(e) => handleFormulationChange('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="formula-version">Version</Label>
            <Input
              id="formula-version"
              value={formulation.version}
              onChange={(e) => handleFormulationChange('version', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="formula-type">Type</Label>
            <Select
              value={formulation.type}
              onValueChange={(value) => handleFormulationChange('type', value)}
            >
              <SelectTrigger id="formula-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concentrate">Concentrate</SelectItem>
                <SelectItem value="final_product">Final Product</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="formula-status">Status</Label>
            <Select
              value={formulation.status}
              onValueChange={(value) => handleFormulationChange('status', value)}
            >
              <SelectTrigger id="formula-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-4">Ingredients</h3>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {formulation.ingredients.map((ingredient, idx) => (
                <Card key={ingredient.id} className="p-4">
                  <div className="grid grid-cols-6 gap-3 items-center">
                    <div className="col-span-2">
                      <Input
                        placeholder="Name"
                        value={ingredient.name}
                        onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={ingredient.quantity}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="%"
                        value={ingredient.percentage}
                        onChange={(e) => handleIngredientChange(idx, 'percentage', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Select
                        value={ingredient.function}
                        onValueChange={(value) => handleIngredientChange(idx, 'function', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INGREDIENT_FUNCTIONS.map(fn => (
                            <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(idx)}
                      >
                        <Trash size={18} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <Card className="p-4 mt-4 bg-secondary/30">
            <div className="grid grid-cols-6 gap-3 items-end">
              <div className="col-span-2">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="Ingredient name"
                  value={newIngredient.name || ''}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newIngredient.quantity || ''}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Percentage</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newIngredient.percentage || ''}
                  onChange={(e) => setNewIngredient({ ...newIngredient, percentage: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Function</Label>
                <Select
                  value={newIngredient.function}
                  onValueChange={(value) => setNewIngredient({ ...newIngredient, function: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INGREDIENT_FUNCTIONS.map(fn => (
                      <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button onClick={addIngredient} size="icon">
                  <Plus size={18} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
