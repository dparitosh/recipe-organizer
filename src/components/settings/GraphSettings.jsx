import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Network, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

const DEFAULT_GRAPH_CONFIG = {
  colors: {
    nutrient: 'oklch(0.68 0.17 140)',
    formulation: 'oklch(0.65 0.08 255)',
    ingredient: 'oklch(0.74 0.17 210)',
    process: 'oklch(0.70 0.13 70)',
    cost: 'oklch(0.65 0.12 25)',
  },
  nodeLabels: {
    nutrient: 'Nutrient',
    formulation: 'Formulation',
    ingredient: 'Ingredient',
    process: 'Process',
    cost: 'Cost',
  },
  relationships: {
    contains: 'CONTAINS',
    provides: 'PROVIDES',
    produces: 'PRODUCES',
    requires: 'REQUIRES',
  },
}

export function GraphSettings({ config, onConfigChange }) {
  const graphConfig = {
    colors: { ...DEFAULT_GRAPH_CONFIG.colors, ...(config?.graph?.colors ?? {}) },
    nodeLabels: { ...DEFAULT_GRAPH_CONFIG.nodeLabels, ...(config?.graph?.nodeLabels ?? {}) },
    relationships: { ...DEFAULT_GRAPH_CONFIG.relationships, ...(config?.graph?.relationships ?? {}) },
  }

  const handleGraphUpdate = (updates) => {
    onConfigChange?.({
      graph: {
        ...graphConfig,
        ...updates,
      },
    })
  }

  const handleColorChange = (nodeType, color) => {
    handleGraphUpdate({
      colors: {
        ...graphConfig.colors,
        [nodeType]: color,
      },
    })
  }

  const handleLabelChange = (nodeType, label) => {
    handleGraphUpdate({
      nodeLabels: {
        ...graphConfig.nodeLabels,
        [nodeType]: label,
      },
    })
  }

  const handleRelationshipChange = (relType, name) => {
    handleGraphUpdate({
      relationships: {
        ...graphConfig.relationships,
        [relType]: name,
      },
    })
  }

  const handleSave = () => {
    toast.success('Graph settings saved')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Network className="text-primary" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Graph Visualization Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure Neo4j graph node labels, colors, and relationships
            </p>
          </div>
        </div>

        <Separator className="mb-6" />

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Node Colors</TabsTrigger>
            <TabsTrigger value="labels">Node Labels</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(graphConfig.colors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`color-${key}`} className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`color-${key}`}
                      type="text"
                      value={value}
                      onChange={(event) => handleColorChange(key, event.target.value)}
                      placeholder="oklch(0.50 0.16 255)"
                      className="font-mono text-xs"
                    />
                    <div
                      className="w-10 h-10 rounded border flex-shrink-0"
                      style={{ backgroundColor: value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="labels" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(graphConfig.nodeLabels).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`label-${key}`} className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <Input
                    id={`label-${key}`}
                    type="text"
                    value={value}
                    onChange={(event) => handleLabelChange(key, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="relationships" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(graphConfig.relationships).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`rel-${key}`} className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <Input
                    id={`rel-${key}`}
                    type="text"
                    value={value}
                    onChange={(event) => handleRelationshipChange(key, event.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={handleSave} className="w-full gap-2 mt-6">
          <CheckCircle size={18} weight="bold" />
          Save Graph Settings
        </Button>
      </Card>
    </div>
  )
}
