import { BOMComponent } from '@/lib/schemas/bom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Trash, Package, Cube } from '@phosphor-icons/react'

interface IngredientTreeProps {
  components: BOMComponent[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<BOMComponent>) => void
  onRemove: (id: string) => void
}

export function IngredientTree({
  components,
  selectedId,
  onSelect,
  onRemove
}: IngredientTreeProps) {
  const groupedComponents = components.reduce((acc, comp) => {
    if (!acc[comp.phase]) {
      acc[comp.phase] = []
    }
    acc[comp.phase].push(comp)
    return acc
  }, {} as Record<string, BOMComponent[]>)

  const phaseColors = {
    procurement: 'text-blue-500',
    production: 'text-green-500',
    packaging: 'text-amber-500'
  }

  const phaseLabels = {
    procurement: 'Procurement',
    production: 'Production',
    packaging: 'Packaging'
  }

  return (
    <div className="p-2 space-y-4">
      {Object.entries(groupedComponents).map(([phase, comps]) => (
        <div key={phase}>
          <div className="flex items-center gap-2 px-2 py-1 mb-2">
            <Package size={16} className={phaseColors[phase as keyof typeof phaseColors]} />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {phaseLabels[phase as keyof typeof phaseLabels]}
            </span>
            <Badge variant="outline" className="text-xs">
              {comps.length}
            </Badge>
          </div>

          <div className="space-y-1 ml-4">
            {comps.map((comp) => (
              <div
                key={comp.id}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors',
                  selectedId === comp.id && 'bg-accent border border-accent-foreground/20'
                )}
                onClick={() => onSelect(comp.id)}
              >
                <Cube size={16} className="text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{comp.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {comp.quantity} {comp.unit} × ${comp.cost.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(comp.id)
                    }}
                  >
                    <Trash size={14} />
                  </Button>
                </div>

                <div className="text-xs font-semibold text-muted-foreground">
                  ${(comp.quantity * comp.cost).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {components.length === 0 && (
        <div className="p-8 text-center">
          <Package size={48} className="mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No components yet</p>
          <p className="text-xs text-muted-foreground/70">Click + to add components</p>
        </div>
      )}
    </div>
  )
}
