import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils.js'
import { Trash, Package, Cube } from '@phosphor-icons/react'

const phaseColors = {
  procurement: 'text-blue-500',
  production: 'text-green-500',
  packaging: 'text-amber-500',
}

const phaseLabels = {
  procurement: 'Procurement',
  production: 'Production',
  packaging: 'Packaging',
}

export function IngredientTree({ components, selectedId, onSelect, onRemove }) {
  const groupedComponents = components.reduce((acc, component) => {
    if (!acc[component.phase]) {
      acc[component.phase] = []
    }
    acc[component.phase].push(component)
    return acc
  }, {})

  const renderPhase = (phase, items) => {
    const colorClass = phaseColors[phase] || 'text-muted-foreground'
    const label = phaseLabels[phase] || phase

    return (
      <div key={phase}>
        <div className="flex items-center gap-2 px-2 py-1 mb-2">
          <Package size={16} className={colorClass} />
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <Badge variant="outline" className="text-xs">
            {items.length}
          </Badge>
        </div>

        <div className="space-y-1 ml-4">
          {items.map((component) => (
            <div
              key={component.id}
              className={cn(
                'group flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors',
                selectedId === component.id && 'bg-accent border border-accent-foreground/20'
              )}
              onClick={() => onSelect(component.id)}
            >
              <Cube size={16} className="text-muted-foreground flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{component.description}</p>
                <p className="text-xs text-muted-foreground">
                  {component.quantity} {component.unit} × ${component.cost.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove(component.id)
                  }}
                >
                  <Trash size={14} />
                </Button>
              </div>

              <div className="text-xs font-semibold text-muted-foreground">
                ${(component.quantity * component.cost).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-4">
      {Object.entries(groupedComponents).map(([phase, items]) => renderPhase(phase, items))}

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
