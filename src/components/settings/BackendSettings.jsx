import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Gear, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function BackendSettings({ config, onConfigChange }) {
  const backendConfig = config?.backend ?? {
    apiUrl: 'http://localhost:8000',
    healthCheckIntervalMs: 30000,
    requestTimeoutMs: 10000,
  }

  const handleBackendChange = (field, value) => {
    onConfigChange?.({
      backend: {
        ...backendConfig,
        [field]: value,
      },
    })
  }

  const handleSave = () => {
    toast.success('Backend settings saved')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Gear className="text-primary" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Backend API Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure connection to the Python FastAPI backend server
            </p>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backend-url">Backend API URL</Label>
            <Input
              id="backend-url"
              type="text"
              value={backendConfig.apiUrl}
              onChange={(event) => handleBackendChange('apiUrl', event.target.value)}
              placeholder="http://localhost:8000"
            />
            <p className="text-xs text-muted-foreground">Base URL for the FastAPI backend server</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="health-check-interval">Health Check Interval (ms)</Label>
              <Input
                id="health-check-interval"
                type="number"
                value={backendConfig.healthCheckIntervalMs}
                onChange={(event) =>
                  handleBackendChange('healthCheckIntervalMs', parseInt(event.target.value, 10) || 0)
                }
                placeholder="30000"
              />
              <p className="text-xs text-muted-foreground">How often to check backend connectivity</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-timeout">Request Timeout (ms)</Label>
              <Input
                id="request-timeout"
                type="number"
                value={backendConfig.requestTimeoutMs}
                onChange={(event) =>
                  handleBackendChange('requestTimeoutMs', parseInt(event.target.value, 10) || 0)
                }
                placeholder="10000"
              />
              <p className="text-xs text-muted-foreground">Maximum time to wait for API responses</p>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <CheckCircle size={18} weight="bold" />
            Save Backend Settings
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-sm mb-3 text-blue-900">Backend Architecture</h4>
        <div className="space-y-2 text-xs text-blue-800">
          <div className="p-2 bg-white/50 rounded">
            <span className="font-semibold">Stack:</span> Python FastAPI + Pydantic + Neo4j
          </div>
          <div className="p-2 bg-white/50 rounded">
            <span className="font-semibold">API Docs:</span> Available at{' '}
            <code className="bg-blue-100 px-1 rounded">{backendConfig.apiUrl}/docs</code>
          </div>
          <div className="p-2 bg-white/50 rounded">
            <span className="font-semibold">Health Check:</span>{' '}
            <code className="bg-blue-100 px-1 rounded">{backendConfig.apiUrl}/health</code>
          </div>
        </div>
      </Card>
    </div>
  )
}
