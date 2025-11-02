export interface Recipe {
  id: string
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
  createdAt: number
  updatedAt: number
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>
