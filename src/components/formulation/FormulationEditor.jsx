import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash, Percent } from '@phosphor-icons/react';
import { INGREDIENT_FUNCTIONS } from '@/lib/schemas/formulation';
import { ScrollArea } from '@/components/ui/scroll-area';

export const FormulationEditor = ({ formulation, onChange }) => {
  const [newIngredient, setNewIngredient] = useState({ function: 'unspecified', percentage: 0, cost_per_kg: 0 });

  const totalPercentage = useMemo(
    () => formulation.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0), 0),
    [formulation.ingredients]
  );

  const handleFormulationChange = (field, value) => {
    onChange({
      ...formulation,
      [field]: value,
    });
  };

  const handleIngredientChange = (index, field, rawValue) => {
    const updated = [...formulation.ingredients];
    const value = field === 'percentage' || field === 'cost_per_kg'
      ? Number.isNaN(parseFloat(rawValue)) ? 0 : parseFloat(rawValue)
      : rawValue;

    updated[index] = { ...updated[index], [field]: value };
    handleFormulationChange('ingredients', updated);
  };

  const addIngredient = () => {
    if (!newIngredient.name?.trim()) {
      return;
    }

    const safePercentage = Number.isNaN(parseFloat(newIngredient.percentage)) ? 0 : parseFloat(newIngredient.percentage);
    const safeCost = Number.isNaN(parseFloat(newIngredient.cost_per_kg)) ? 0 : parseFloat(newIngredient.cost_per_kg);

    const ingredient = {
      id: `ing-${Date.now()}`,
      name: newIngredient.name.trim(),
      percentage: safePercentage,
      cost_per_kg: safeCost,
      function: newIngredient.function || 'unspecified',
    };

    handleFormulationChange('ingredients', [...formulation.ingredients, ingredient]);
    setNewIngredient({ function: 'unspecified', percentage: 0, cost_per_kg: 0 });
  };

  const removeIngredient = (index) => {
    const updated = formulation.ingredients.filter((_, i) => i !== index);
    handleFormulationChange('ingredients', updated);
  };

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
            <Label htmlFor="formula-status">Status</Label>
            <Select value={formulation.status} onValueChange={(value) => handleFormulationChange('status', value)}>
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
          <div className="space-y-2 col-span-2">
            <Label htmlFor="formula-description">Description</Label>
            <Textarea
              id="formula-description"
              value={formulation.description || ''}
              onChange={(e) => handleFormulationChange('description', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold mb-4">Ingredients</h3>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {formulation.ingredients.map((ingredient, idx) => (
                <Card key={ingredient.id ?? `${ingredient.name}-${idx}`} className="p-4">
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
                        placeholder="%"
                        value={ingredient.percentage}
                        onChange={(e) => handleIngredientChange(idx, 'percentage', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Cost/kg"
                        value={ingredient.cost_per_kg ?? 0}
                        onChange={(e) => handleIngredientChange(idx, 'cost_per_kg', e.target.value)}
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
                          {INGREDIENT_FUNCTIONS.map((fn) => (
                            <SelectItem key={fn} value={fn}>
                              {fn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button variant="ghost" size="icon" onClick={() => removeIngredient(idx)}>
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
                <Label className="text-xs">Percentage</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newIngredient.percentage ?? ''}
                  onChange={(e) => setNewIngredient({ ...newIngredient, percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs">Cost/kg</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newIngredient.cost_per_kg ?? ''}
                  onChange={(e) => setNewIngredient({ ...newIngredient, cost_per_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs">Function</Label>
                <Select
                  value={newIngredient.function}
                  onValueChange={(value) => setNewIngredient({ ...newIngredient, function: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INGREDIENT_FUNCTIONS.map((fn) => (
                      <SelectItem key={fn} value={fn}>
                        {fn}
                      </SelectItem>
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
  );
};

export default FormulationEditor;
