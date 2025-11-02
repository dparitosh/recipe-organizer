import { CookingPot } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onAddRecipe: () => void
}

export function EmptyState({ onAddRecipe }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-32 h-32 bg-secondary/30 rounded-full flex items-center justify-center mb-6">
        <CookingPot className="text-primary" size={64} weight="duotone" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">No Recipes Yet</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Start building your personal cookbook by adding your first recipe
      </p>
      <Button onClick={onAddRecipe} size="lg">
        Add Your First Recipe
      </Button>
    </div>
  )
}
