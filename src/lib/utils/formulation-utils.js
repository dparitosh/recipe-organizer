export const normalizeFormulation = (formulation) => {
  if (!formulation) {
    return null
  }

  const ingredients = Array.isArray(formulation.ingredients) ? formulation.ingredients : []

  const normalizedIngredients = ingredients.map((ingredient, index) => ({
    id: ingredient.id ?? `${formulation.id}-ingredient-${index}`,
    name: ingredient.name || '',
    percentage: Number.isFinite(Number(ingredient.percentage)) ? Number(ingredient.percentage) : 0,
    function: ingredient.function || 'unspecified',
    cost_per_kg: Number.isFinite(Number(ingredient.cost_per_kg))
      ? Number(ingredient.cost_per_kg)
      : Number.isFinite(Number(ingredient.costPerKg))
        ? Number(ingredient.costPerKg)
        : 0,
  }))

  const totalPercentage = normalizedIngredients.reduce((sum, ing) => sum + (ing.percentage || 0), 0)

  return {
    id: formulation.id,
    name: formulation.name || 'Untitled Formulation',
    description: formulation.description || '',
    status: formulation.status || 'draft',
    created_at: formulation.created_at,
    updated_at: formulation.updated_at,
    ingredients: normalizedIngredients,
    total_percentage: totalPercentage,
  }
}
