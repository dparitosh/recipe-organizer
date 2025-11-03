import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIServiceSettings } from '@/components/AIServiceSettings'
import { Gear, CloudArrowDown } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function SettingsView({ backendUrl, onBackendUrlChange }) {
  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure backend connections and AI service
        </p>
      </div>

      <Tabs defaultValue="backend" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
          <TabsTrigger value="backend" className="gap-2">
            <Gear size={16} />
            Backend
          </TabsTrigger>
          <TabsTrigger value="ai-service" className="gap-2">
            <CloudArrowDown size={16} />
            AI Service
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backend" className="space-y-6 mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gear size={24} className="text-primary" />
              Backend Configuration
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backend-url">Backend API URL</Label>
                <Input
                  id="backend-url"
                  value={backendUrl}
                  onChange={(e) => onBackendUrlChange(e.target.value)}
                  placeholder="http://localhost:8000"
                />
                <p className="text-sm text-muted-foreground">
                  URL of the Python FastAPI backend server
                </p>
              </div>

              <Button onClick={handleSave} className="w-full">
                Save Settings
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai-service" className="space-y-6 mt-6">
          <AIServiceSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
