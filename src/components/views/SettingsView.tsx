import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DataImportMapper } from '@/components/DataImportMapper'
import { Gear } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SettingsViewProps {
  backendUrl: string
  onBackendUrlChange: (url: string) => void
}

export function SettingsView({ backendUrl, onBackendUrlChange }: SettingsViewProps) {
  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  const handleImportComplete = (data: any[]) => {
    toast.success(`Import complete! ${data.length} records processed`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure backend connections and data import
        </p>
      </div>

      <DataImportMapper 
        backendUrl={backendUrl}
        onImportComplete={handleImportComplete}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Architecture</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">Frontend</h4>
              <p className="text-muted-foreground">React 19 + TypeScript + Tailwind CSS v4</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">Backend</h4>
              <p className="text-muted-foreground">Python FastAPI + Pydantic</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">Database</h4>
              <p className="text-muted-foreground">Neo4j Graph Database</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">Graph Visualization</h4>
              <p className="text-muted-foreground">Cytoscape.js with physics</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="text-lg font-semibold mb-2">Backend Setup Instructions</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>1. Ensure Python 3.10+ is installed</p>
          <p>2. Install dependencies: <code className="bg-muted px-2 py-1 rounded">pip install fastapi uvicorn neo4j python-dotenv pydantic</code></p>
          <p>3. Configure Neo4j connection in backend <code className="bg-muted px-2 py-1 rounded">.env</code> file</p>
          <p>4. Start backend: <code className="bg-muted px-2 py-1 rounded">uvicorn main:app --reload --port 8000</code></p>
          <p>5. Backend API docs available at: <code className="bg-muted px-2 py-1 rounded">{backendUrl}/docs</code></p>
        </div>
      </Card>
    </div>
  )
}
