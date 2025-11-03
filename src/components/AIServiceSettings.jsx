import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  CheckCircle, 
  Warning, 
  Lightning, 
  Globe, 
  Database,
  Sparkle,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { aiAssistant } from '@/lib/ai'
import { toast } from 'sonner'

export function AIServiceSettings({ backendUrl, onBackendUrlChange }) {
  const [serviceMode, setServiceMode] = useKV('ai-service-mode', 'auto')
  const [autoFallback, setAutoFallback] = useKV('ai-auto-fallback', true)
  const [localBackendUrl, setLocalBackendUrl] = useState(backendUrl || 'http://localhost:8000')
  const [isTestingHealth, setIsTestingHealth] = useState(false)
  const [healthStatus, setHealthStatus] = useState(null)

  useEffect(() => {
    aiAssistant.setBackendUrl(backendUrl)
    aiAssistant.setServiceMode(serviceMode)
  }, [backendUrl, serviceMode])

  const handleTestHealth = async () => {
    setIsTestingHealth(true)
    
    try {
      aiAssistant.setBackendUrl(localBackendUrl)
      const health = await aiAssistant.checkHealth()
      setHealthStatus(health)
      
      if (health.status === 'healthy' || health.status === 'degraded') {
        toast.success('Connection successful')
      } else {
        toast.error('Service unavailable')
      }
    } catch (error) {
      toast.error('Failed to connect to backend')
      setHealthStatus({ 
        status: 'error', 
        error: error.message,
        llmAvailable: false,
        neo4jAvailable: false,
        genaiAvailable: false
      })
    } finally {
      setIsTestingHealth(false)
    }
  }

  const handleSaveBackendUrl = () => {
    if (onBackendUrlChange) {
      onBackendUrlChange(localBackendUrl)
      toast.success('Backend URL saved')
    }
  }

  const handleServiceModeChange = (mode) => {
    setServiceMode(mode)
    aiAssistant.setServiceMode(mode)
    toast.success(`AI Service mode set to: ${mode}`)
  }

  const getStatusIcon = (available) => {
    if (available === true) {
      return <CheckCircle size={16} weight="fill" className="text-green-600" />
    } else if (available === false) {
      return <Warning size={16} weight="fill" className="text-red-600" />
    }
    return <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
  }

  const getStatusBadge = (status) => {
    if (!status) return null
    
    const variants = {
      healthy: { variant: 'default', className: 'bg-green-600', text: 'Healthy' },
      degraded: { variant: 'secondary', className: 'bg-amber-600', text: 'Degraded' },
      unavailable: { variant: 'destructive', className: 'bg-red-600', text: 'Unavailable' },
      error: { variant: 'destructive', className: 'bg-red-600', text: 'Error' }
    }
    
    const config = variants[status] || variants.unavailable
    
    return (
      <Badge className={config.className}>
        {config.text}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Lightning size={20} weight="bold" className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Service Configuration</h3>
            <p className="text-xs text-muted-foreground">Configure backend connection and service mode</p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="backend-url" className="text-sm font-semibold">
              Backend URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="backend-url"
                value={localBackendUrl}
                onChange={(e) => setLocalBackendUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1"
              />
              <Button 
                onClick={handleSaveBackendUrl}
                variant="outline"
                disabled={localBackendUrl === backendUrl}
              >
                Save
              </Button>
              <Button
                onClick={handleTestHealth}
                disabled={isTestingHealth}
                className="gap-2"
              >
                {isTestingHealth ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Testing
                  </>
                ) : (
                  <>
                    <ArrowsClockwise size={16} weight="bold" />
                    Test
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Python FastAPI backend URL for AI and data processing
            </p>
          </div>

          {healthStatus && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Service Status</span>
                {getStatusBadge(healthStatus.status)}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(healthStatus.llmAvailable)}
                    <span>LLM Service (GPT-4)</span>
                  </div>
                  <span className="text-muted-foreground">
                    {healthStatus.llmAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(healthStatus.neo4jAvailable)}
                    <span>Neo4j Database</span>
                  </div>
                  <span className="text-muted-foreground">
                    {healthStatus.neo4jAvailable ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(healthStatus.genaiAvailable)}
                    <span>GenAI Plugin</span>
                  </div>
                  <span className="text-muted-foreground">
                    {healthStatus.genaiAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>

              {healthStatus.responseTimeMs > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Response Time: {healthStatus.responseTimeMs}ms
                  </span>
                </div>
              )}

              {healthStatus.error && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-red-600">
                    Error: {healthStatus.error}
                  </span>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Label htmlFor="service-mode" className="text-sm font-semibold">
              Service Mode
            </Label>
            <Select value={serviceMode} onValueChange={handleServiceModeChange}>
              <SelectTrigger id="service-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  <div className="flex items-center gap-2">
                    <Globe size={16} />
                    <span>Online</span>
                  </div>
                </SelectItem>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <Lightning size={16} />
                    <span>Auto (Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="offline">
                  <div className="flex items-center gap-2">
                    <Database size={16} />
                    <span>Offline</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              {serviceMode === 'online' && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Globe size={14} className="mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900">Online Mode</p>
                      <p className="text-blue-700">Full AI capabilities with GPT-4 and Neo4j graph queries. Requires active backend connection.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {serviceMode === 'auto' && (
                <div className="p-3 bg-green-50 rounded-md border border-green-200">
                  <div className="flex items-start gap-2">
                    <Lightning size={14} className="mt-0.5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Auto Mode (Recommended)</p>
                      <p className="text-green-700">Attempts online processing first, automatically falls back to offline mode if service unavailable. Best for reliability.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {serviceMode === 'offline' && (
                <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                  <div className="flex items-start gap-2">
                    <Database size={14} className="mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">Offline Mode</p>
                      <p className="text-amber-700">Basic keyword search and local data access only. No external service required but limited capabilities.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {serviceMode === 'auto' && (
            <>
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-fallback" className="text-sm font-semibold">
                    Auto Fallback
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically switch to offline mode on service failure
                  </p>
                </div>
                <Switch
                  id="auto-fallback"
                  checked={autoFallback}
                  onCheckedChange={setAutoFallback}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkle size={24} className="text-primary flex-shrink-0" weight="bold" />
          <div className="space-y-2">
            <h4 className="font-semibold">AI Service Information</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>Online Mode:</strong> Natural language queries with GPT-4, Cypher generation, graph analysis</p>
              <p>• <strong>Offline Mode:</strong> Keyword-based search, local formulation filtering</p>
              <p>• <strong>Auto Mode:</strong> Seamless fallback between online and offline based on availability</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
