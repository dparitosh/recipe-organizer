import { Node } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Trash } from '@phosphor-icons/react'

interface NodeEditorProps {
  node: Node
  onUpdate: (nodeId: string, updates: Partial<Node>) => void
  onDelete: (nodeId: string) => void
}

const NODE_COLORS = [
  'oklch(0.68 0.18 25)',
  'oklch(0.62 0.24 295)', 
  'oklch(0.75 0.20 130)',
  'oklch(0.70 0.18 50)',
  'oklch(0.65 0.20 260)',
  'oklch(0.72 0.18 340)',
]

export function NodeEditor({ node, onUpdate, onDelete }: NodeEditorProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Node Properties</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(node.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash size={18} />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="node-label">Label</Label>
        <Input
          id="node-label"
          value={node.label}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          placeholder="Node label"
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="grid grid-cols-3 gap-2">
          {NODE_COLORS.map((color) => (
            <button
              key={color}
              className="w-full h-10 rounded-md border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor: node.color === color ? 'oklch(0.72 0.15 195)' : 'transparent',
                boxShadow: node.color === color ? '0 0 0 2px oklch(0.72 0.15 195 / 0.3)' : 'none',
              }}
              onClick={() => onUpdate(node.id, { color })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Position:</span>
          <span>({Math.round(node.x)}, {Math.round(node.y)})</span>
        </div>
        <div className="flex justify-between">
          <span>ID:</span>
          <span className="font-mono text-xs">{node.id.slice(0, 8)}</span>
        </div>
      </div>
    </Card>
  )
}
