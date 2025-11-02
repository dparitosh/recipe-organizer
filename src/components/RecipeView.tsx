import { Recipe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pencil, Trash, ArrowLeft, CookingPot } from '@phosphor-icons/react'

interface RecipeViewProps {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
  onBack: () => void
}

export function RecipeView({ recipe, onEdit, onDelete, onBack }: RecipeViewProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button onClick={onBack} variant="ghost" size="sm">
          <ArrowLeft className="mr-2" size={18} />
          Back
        </Button>
        <div className="flex gap-2">
          <Button onClick={onEdit} variant="outline" size="sm">
            <Pencil className="mr-2" size={18} />
            Edit
          </Button>
          <Button onClick={onDelete} variant="destructive" size="sm">
            <Trash className="mr-2" size={18} />
            Delete
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md overflow-hidden">
        <div className="w-full aspect-[21/9] bg-secondary/30 flex items-center justify-center">
          <CookingPot className="text-primary" size={80} weight="duotone" />
        </div>

        <div className="p-8">
          <h1 className="text-4xl font-bold mb-4">{recipe.title}</h1>
          {recipe.description && (
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              {recipe.description}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold uppercase tracking-wide mb-4 text-foreground/80">
                Ingredients
              </h3>
              <ScrollArea className="max-h-[400px]">
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li 
                      key={index} 
                      className="flex items-start gap-3 text-base leading-relaxed"
                    >
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>

            <div>
              <h3 className="text-xl font-semibold uppercase tracking-wide mb-4 text-foreground/80">
                Instructions
              </h3>
              <ScrollArea className="max-h-[400px]">
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-base leading-relaxed pt-0.5 flex-1">
                        {instruction}
                      </p>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
