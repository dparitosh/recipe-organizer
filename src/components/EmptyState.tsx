import { MagnifyingGlass } from '@phosphor-icons/react'

export function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center max-w-md px-6">
        <MagnifyingGlass className="mx-auto mb-4 text-muted-foreground" size={64} weight="duotone" />
        <h3 className="text-xl font-semibold mb-2">Start Exploring Foods</h3>
        <p className="text-muted-foreground mb-6">
          Search for foods above to add them to your comparison graph. 
          Try searching for "apple", "chicken breast", or "brown rice".
        </p>
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Tips:</p>
          <ul className="space-y-1">
            <li>• Drag nodes to arrange them</li>
            <li>• Shift+Click or Right-click to compare foods</li>
            <li>• Click nodes for detailed nutritional info</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
