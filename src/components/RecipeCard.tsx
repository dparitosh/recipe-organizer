import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Recipe } from '@/lib/types'
import { CookingPot } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface RecipeCardProps {
  recipe: Recipe
  onClick: () => void
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card 
        className="cursor-pointer h-full hover:shadow-lg transition-shadow"
        onClick={onClick}
      >
        <CardHeader className="space-y-2">
          <div className="w-full aspect-video bg-secondary/30 rounded-md flex items-center justify-center mb-2">
            <CookingPot className="text-primary" size={48} weight="duotone" />
          </div>
          <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
          {recipe.description && (
            <CardDescription className="line-clamp-2">
              {recipe.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{recipe.ingredients.length} ingredients</span>
            <span>•</span>
            <span>{recipe.instructions.length} steps</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
