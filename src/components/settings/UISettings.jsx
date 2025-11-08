import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Palette, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

const DEFAULT_UI_CONFIG = {
  toastPosition: 'top-right',
  graphDefaultHeight: '500px',
  graphLayoutAnimationMs: 600,
  searchDebounceMs: 300,
  minTouchTargetSize: 44,
  maxScrollAreaHeight: 640,
}

export function UISettings({ config, onConfigChange }) {
  const uiConfig = { ...DEFAULT_UI_CONFIG, ...(config?.ui ?? {}) }

  const handleUiChange = (field, value) => {
    onConfigChange?.({
      ui: {
        ...uiConfig,
        [field]: value,
      },
    })
  }

  const handleSave = () => {
    toast.success('UI settings saved')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Palette className="text-primary" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">User Interface Settings</h3>
            <p className="text-sm text-muted-foreground">Customize the application user interface behavior</p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toast-position">Toast Notification Position</Label>
            <Select value={uiConfig.toastPosition} onValueChange={(value) => handleUiChange('toastPosition', value)}>
              <SelectTrigger id="toast-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-left">Top Left</SelectItem>
                <SelectItem value="top-center">Top Center</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="bottom-center">Bottom Center</SelectItem>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="graph-height">Graph Default Height</Label>
            <Input
              id="graph-height"
              type="text"
              value={uiConfig.graphDefaultHeight}
              onChange={(event) => handleUiChange('graphDefaultHeight', event.target.value)}
              placeholder="500px"
            />
            <p className="text-xs text-muted-foreground">CSS height value for graph visualizations</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="graph-animation">Graph Animation Duration (ms)</Label>
              <Input
                id="graph-animation"
                type="number"
                value={uiConfig.graphLayoutAnimationMs}
                onChange={(event) => handleUiChange('graphLayoutAnimationMs', parseInt(event.target.value, 10) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-debounce">Search Debounce (ms)</Label>
              <Input
                id="search-debounce"
                type="number"
                value={uiConfig.searchDebounceMs}
                onChange={(event) => handleUiChange('searchDebounceMs', parseInt(event.target.value, 10) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="touch-target">Minimum Touch Target (px)</Label>
              <Input
                id="touch-target"
                type="number"
                value={uiConfig.minTouchTargetSize}
                onChange={(event) => handleUiChange('minTouchTargetSize', parseInt(event.target.value, 10) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scroll-height">Max Scroll Area Height (px)</Label>
              <Input
                id="scroll-height"
                type="number"
                value={uiConfig.maxScrollAreaHeight}
                onChange={(event) => handleUiChange('maxScrollAreaHeight', parseInt(event.target.value, 10) || 0)}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <CheckCircle size={18} weight="bold" />
            Save UI Settings
          </Button>
        </div>
      </Card>
    </div>
  )
}
