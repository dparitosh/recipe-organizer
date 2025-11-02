import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowsOutSimple, 
  Trash, 
  Export, 
  MagnifyingGlassMinus, 
  MagnifyingGlassPlus 
} from '@phosphor-icons/react'

interface ToolbarProps {
  onClearGraph: () => void
  onFitView: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onExport: () => void
  foodCount: number
  comparisonCount: number
}

export function Toolbar({
  onClearGraph,
  onFitView,
  onZoomIn,
  onZoomOut,
  onExport,
  foodCount,
  comparisonCount,
}: ToolbarProps) {
  return (
    <div className="border-b border-border bg-card/20 backdrop-blur-sm px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <Badge variant="secondary" className="font-normal">
            {foodCount} {foodCount === 1 ? 'Food' : 'Foods'}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {comparisonCount} {comparisonCount === 1 ? 'Comparison' : 'Comparisons'}
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="ghost" size="sm" onClick={onZoomIn} title="Zoom In">
          <MagnifyingGlassPlus size={18} />
        </Button>

        <Button variant="ghost" size="sm" onClick={onZoomOut} title="Zoom Out">
          <MagnifyingGlassMinus size={18} />
        </Button>

        <Button variant="ghost" size="sm" onClick={onFitView} title="Fit View">
          <ArrowsOutSimple size={18} />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button variant="ghost" size="sm" onClick={onExport} title="Export Data">
          <Export size={18} />
        </Button>

        {foodCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearGraph}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Clear All"
          >
            <Trash size={18} />
          </Button>
        )}
      </div>
    </div>
  )
}
