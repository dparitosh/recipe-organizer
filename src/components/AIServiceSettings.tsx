import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  CloudArrowDown, 
  CloudSlash, 
  CheckCircle, 
  Warning, 
  Lightning,
  Robot,
  Sparkle,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { aiServiceConfig, AIServiceMode, AIServiceConfig } from '@/lib/services/ai-service-config'
import { aiServiceMonitor, ServiceHealth } from '@/lib/services/ai-service-monitor'
import { toast } from 'sonner'

export function AIServiceSettings() {
  const [config, setConfig] = useKV<AIServiceConfig>('ai-service-config', {
    mode: 'auto',
    offlineCapabilities: {
      basicSearch: true,
      dataAnalysis: true,
      recommendations: true
    },
    autoFallback: true,
    retryAttempts: 2,
    timeoutMs: 10000
  })

  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  useEffect(() => {
    if (config) {
      aiServiceConfig.setConfig(config)
    }

    const unsubscribe = aiServiceMonitor.subscribe((health) => {
      setServiceHealth(health)
    })

    aiServiceMonitor.checkHealth()

    return () => {
      unsubscribe()
    }
  }, [config])

  const handleModeChange = (mode: AIServiceMode) => {
    setConfig((current) => ({ 
      ...current!, 
      mode 
    }))
    aiServiceConfig.setMode(mode)
    toast.success(`AI mode set to: ${mode}`)
  }

  const handleAutoFallbackToggle = (enabled: boolean) => {
    setConfig((current) => ({ 
      ...current!, 
      autoFallback: enabled 
    }))
    toast.success(`Auto-fallback ${enabled ? 'enabled' : 'disabled'}`)
  }

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true)
    try {
      const health = await aiServiceMonitor.checkHealth()
      if (health.status === 'online') {
        toast.success('AI service is online and responsive')
      } else if (health.status === 'offline') {
        toast.warning('AI service is offline')
      } else {
        toast.error(`AI service error: ${health.errorMessage}`)
      }
    } catch (error) {
      toast.error('Failed to check AI service health')
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-gray-400'
      case 'checking': return 'bg-yellow-500 animate-pulse'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'online': return <CheckCircle size={20} weight="fill" className="text-green-600" />
      case 'offline': return <CloudSlash size={20} weight="fill" className="text-gray-500" />
      case 'checking': return <ArrowsClockwise size={20} weight="bold" className="text-yellow-600 animate-spin" />
      case 'error': return <Warning size={20} weight="fill" className="text-red-600" />
      default: return <CloudSlash size={20} weight="fill" className="text-gray-500" />
    }
  }

  const getModeIcon = (mode: AIServiceMode) => {
    switch (mode) {
      case 'online': return <CloudArrowDown size={18} weight="bold" />
      case 'offline': return <Robot size={18} weight="bold" />
      case 'auto': return <Sparkle size={18} weight="bold" />
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lightning size={24} className="text-primary" weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">AI Service Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure how the AI Assistant operates. Choose between online mode (full AI capabilities), 
              offline mode (local processing only), or auto mode (automatic fallback when service is unavailable).
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-6">
          <div>
            <Label className="text-sm font-semibold mb-3 block">AI Service Mode</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleModeChange('online')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config?.mode === 'online'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CloudArrowDown size={20} weight="bold" className={config?.mode === 'online' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`font-semibold text-sm ${config?.mode === 'online' ? 'text-primary' : 'text-foreground'}`}>
                    Online
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Full AI capabilities with GPT-4 and Neo4j graph analysis
                </p>
              </button>

              <button
                onClick={() => handleModeChange('auto')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config?.mode === 'auto'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle size={20} weight="bold" className={config?.mode === 'auto' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`font-semibold text-sm ${config?.mode === 'auto' ? 'text-primary' : 'text-foreground'}`}>
                    Auto
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Automatic fallback to offline mode when service is down
                </p>
              </button>

              <button
                onClick={() => handleModeChange('offline')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config?.mode === 'offline'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Robot size={20} weight="bold" className={config?.mode === 'offline' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`font-semibold text-sm ${config?.mode === 'offline' ? 'text-primary' : 'text-foreground'}`}>
                    Offline
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Local processing only, no external AI service required
                </p>
              </button>
            </div>
          </div>

          {config?.mode === 'auto' && (
            <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="auto-fallback" className="text-sm font-semibold">
                  Auto-Fallback to Offline
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically switch to offline mode when AI service is unavailable
                </p>
              </div>
              <Switch
                id="auto-fallback"
                checked={config?.autoFallback ?? true}
                onCheckedChange={handleAutoFallbackToggle}
              />
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3 block">Service Status</Label>
            {serviceHealth ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(serviceHealth.status)}`} />
                    {getStatusIcon(serviceHealth.status)}
                    <div>
                      <p className="text-sm font-semibold capitalize">{serviceHealth.status}</p>
                      <p className="text-xs text-muted-foreground">
                        Last checked: {serviceHealth.lastChecked.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheckHealth}
                    disabled={isCheckingHealth}
                    className="gap-2"
                  >
                    <ArrowsClockwise 
                      size={16} 
                      weight="bold" 
                      className={isCheckingHealth ? 'animate-spin' : ''}
                    />
                    Check Now
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightning size={16} className={serviceHealth.capabilities.llm ? 'text-green-600' : 'text-gray-400'} weight="bold" />
                      <p className="text-xs font-semibold">LLM Service</p>
                    </div>
                    <Badge variant={serviceHealth.capabilities.llm ? 'default' : 'secondary'} className="text-xs">
                      {serviceHealth.capabilities.llm ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>

                  <div className="p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <CloudArrowDown size={16} className={serviceHealth.capabilities.neo4j ? 'text-green-600' : 'text-gray-400'} weight="bold" />
                      <p className="text-xs font-semibold">Neo4j</p>
                    </div>
                    <Badge variant={serviceHealth.capabilities.neo4j ? 'default' : 'secondary'} className="text-xs">
                      {serviceHealth.capabilities.neo4j ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>

                  <div className="p-3 border rounded-lg bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkle size={16} className={serviceHealth.capabilities.genai ? 'text-green-600' : 'text-gray-400'} weight="bold" />
                      <p className="text-xs font-semibold">GenAI</p>
                    </div>
                    <Badge variant={serviceHealth.capabilities.genai ? 'default' : 'secondary'} className="text-xs">
                      {serviceHealth.capabilities.genai ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {serviceHealth.responseTime !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Response time: {serviceHealth.responseTime}ms
                  </p>
                )}

                {serviceHealth.errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{serviceHealth.errorMessage}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">Checking service status...</p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-3 block">Offline Mode Capabilities</Label>
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span>Basic keyword search in local formulations</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span>Simple data analysis and summaries</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span>Generic optimization recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Warning size={16} weight="fill" className="text-amber-600" />
                <span>No semantic search or advanced NLP</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Warning size={16} weight="fill" className="text-amber-600" />
                <span>No graph database queries</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Warning size={16} weight="fill" className="text-amber-600" />
                <span>No formulation-specific insights</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50/50 border-blue-200">
        <div className="flex gap-3">
          <Robot size={24} className="text-blue-600 flex-shrink-0" weight="bold" />
          <div>
            <h4 className="text-sm font-semibold mb-2 text-blue-900">About Offline Mode</h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Offline mode provides basic AI assistant functionality without requiring an external AI service connection. 
              It uses local keyword matching and rule-based analysis to answer questions about your formulations. 
              While less sophisticated than online mode, it ensures you can always access basic search and analysis features 
              even when the AI service is unavailable. For the best experience with advanced semantic search, 
              graph analysis, and personalized recommendations, use online or auto mode when the service is available.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
