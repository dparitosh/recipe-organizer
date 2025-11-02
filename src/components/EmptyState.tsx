import { Graph, Plus } from '@phosphor-icons/react'

interface EmptyStateProps {
  onAddNode: () => void
}

export function EmptyState({ onAddNode }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-card p-6">
            <Graph size={64} className="text-muted-foreground" weight="duotone" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Create Your First Graph</h2>
          <p className="text-muted-foreground">
            Double-click anywhere on the canvas to add nodes, or use the button below
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground pointer-events-auto">
          <p><kbd className="px-2 py-1 bg-card rounded border border-border">Shift + Drag</kbd> from a node to create edges</p>
          <p><kbd className="px-2 py-1 bg-card rounded border border-border">Drag</kbd> nodes to reposition them</p>
          <p><kbd className="px-2 py-1 bg-card rounded border border-border">Scroll</kbd> to zoom in and out</p>
        </div>
      </div>
    </div>
  )
}
