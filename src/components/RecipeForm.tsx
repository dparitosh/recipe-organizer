import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { X, Plus, Trash } from '@phosphor-icons/react'
import { RecipeFormData } from '@/lib/types'

interface RecipeFormProps {
  initialData?: RecipeFormData
  onSave: (data: RecipeFormData) => void
  onCancel: () => void
}

export function RecipeForm({ initialData, onSave, onCancel }: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [ingredients, setIngredients] = useState<string[]>(initialData?.ingredients || [''])
  const [instructions, setInstructions] = useState<string[]>(initialData?.instructions || [''])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const filteredIngredients = ingredients.filter(i => i.trim() !== '')
    const filteredInstructions = instructions.filter(i => i.trim() !== '')
    
    if (!title.trim() || filteredIngredients.length === 0 || filteredInstructions.length === 0) {
      return
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      ingredients: filteredIngredients,
      instructions: filteredInstructions,
    })
  }

  const addIngredient = () => {
    setIngredients([...ingredients, ''])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients]
    updated[index] = value
    setIngredients(updated)
  }

  const addInstruction = () => {
    setInstructions([...instructions, ''])
  }

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index))
  }

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions]
    updated[index] = value
    setInstructions(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Recipe Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Grandma's Chocolate Chip Cookies"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of your recipe..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ingredients *</Label>
          <Button type="button" onClick={addIngredient} size="sm" variant="outline">
            <Plus className="mr-1" size={16} />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={ingredient}
                onChange={(e) => updateIngredient(index, e.target.value)}
                placeholder="e.g., 2 cups all-purpose flour"
              />
              {ingredients.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash size={18} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Instructions *</Label>
          <Button type="button" onClick={addInstruction} size="sm" variant="outline">
            <Plus className="mr-1" size={16} />
            Add Step
          </Button>
        </div>
        <div className="space-y-3">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm mt-1">
                {index + 1}
              </div>
              <Textarea
                value={instruction}
                onChange={(e) => updateInstruction(index, e.target.value)}
                placeholder="Describe this step..."
                rows={2}
                className="flex-1"
              />
              {instructions.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0"
                >
                  <Trash size={18} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button type="submit">
          Save Recipe
        </Button>
      </div>
    </form>
  )
}
