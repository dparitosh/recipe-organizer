import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Recipe, RecipeFormData } from '@/lib/types'
import { RecipeCard } from '@/components/RecipeCard'
import { RecipeView } from '@/components/RecipeView'
import { RecipeForm } from '@/components/RecipeForm'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Toaster } from '@/components/ui/sonner'
import { Plus, CookingPot } from '@phosphor-icons/react'
import { toast } from 'sonner'

type View = 'list' | 'view' | 'add' | 'edit'

function App() {
  const [recipes, setRecipes] = useKV<Recipe[]>('recipes', [])
  const [currentView, setCurrentView] = useState<View>('list')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleAddRecipe = (data: RecipeFormData) => {
    const newRecipe: Recipe = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    setRecipes((current) => [...(current || []), newRecipe])
    setCurrentView('list')
    toast.success('Recipe added successfully!')
  }

  const handleEditRecipe = (data: RecipeFormData) => {
    if (!selectedRecipe) return

    setRecipes((current) =>
      (current || []).map((recipe) =>
        recipe.id === selectedRecipe.id
          ? { ...recipe, ...data, updatedAt: Date.now() }
          : recipe
      )
    )
    
    setCurrentView('view')
    setSelectedRecipe({ ...selectedRecipe, ...data, updatedAt: Date.now() })
    toast.success('Recipe updated successfully!')
  }

  const handleDeleteRecipe = () => {
    if (!selectedRecipe) return

    setRecipes((current) => (current || []).filter((recipe) => recipe.id !== selectedRecipe.id))
    setShowDeleteDialog(false)
    setSelectedRecipe(null)
    setCurrentView('list')
    toast.success('Recipe deleted')
  }

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setCurrentView('view')
  }

  const handleBackToList = () => {
    setSelectedRecipe(null)
    setCurrentView('list')
  }

  const recipeList = recipes || []

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CookingPot className="text-primary" size={32} weight="duotone" />
            <h1 className="text-3xl font-bold">Recipe Keeper</h1>
          </div>
          {currentView === 'list' && recipeList.length > 0 && (
            <Button onClick={() => setCurrentView('add')}>
              <Plus className="mr-2" size={20} />
              Add Recipe
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {currentView === 'list' && (
          <>
            {recipeList.length === 0 ? (
              <EmptyState onAddRecipe={() => setCurrentView('add')} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipeList.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => handleViewRecipe(recipe)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {currentView === 'view' && selectedRecipe && (
          <RecipeView
            recipe={selectedRecipe}
            onEdit={() => setCurrentView('edit')}
            onDelete={() => setShowDeleteDialog(true)}
            onBack={handleBackToList}
          />
        )}
      </main>

      <Dialog open={currentView === 'add'} onOpenChange={(open) => !open && setCurrentView('list')}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Recipe</DialogTitle>
          </DialogHeader>
          <RecipeForm
            onSave={handleAddRecipe}
            onCancel={() => setCurrentView('list')}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={currentView === 'edit'} onOpenChange={(open) => !open && setCurrentView('view')}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <RecipeForm
              initialData={selectedRecipe}
              onSave={handleEditRecipe}
              onCancel={() => setCurrentView('view')}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRecipe?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecipe} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default App