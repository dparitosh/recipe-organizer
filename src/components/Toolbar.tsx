import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, ArrowsOutSimple, Trash, Export, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'

interface ToolbarProps {
  onAddNode: () => void
  onClearGraph: () => void
  onFitView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onExport: () => void
  nodeCount: number
  edgeCount: number
}

export function Toolbar({
  onAddNode,
  onClearGraph,
  onFitView,
  onZoomIn,
  onZoomOut,
  onExport,
  nodeCount,
  edgeCount,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
      <Button onClick={onAddNode} size="sm">
        <Plus className="mr-2" size={16} />
        Add Node
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button onClick={onZoomIn} variant="ghost" size="icon">
        <MagnifyingGlassPlus size={18} />
      </Button>
      <Button onClick={onZoomOut} variant="ghost" size="icon">
        <MagnifyingGlassMinus size={18} />
      </Button>
      <Button onClick={onFitView} variant="ghost" size="icon">
        <ArrowsOutSimple size={18} />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button onClick={onExport} variant="ghost" size="icon">
        <Export size={18} />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" disabled={nodeCount === 0}>
            <Trash size={18} />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Graph?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all {nodeCount} nodes and {edgeCount} edges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClearGraph} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
        <span>{nodeCount} nodes</span>
        <span>{edgeCount} edges</span>
      </div>
    </div>
  )
}
