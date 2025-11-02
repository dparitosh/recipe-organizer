import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Database, CheckCircle, Warning, Info, Gear, CloudArrowUp } from '@phosphor-icons/react'
import { fdcService } from '@/lib/services/fdc-service'
import { FDC_CONSTANTS } from '@/lib/constants'
import { Neo4jDataLoader } from './Neo4jDataLoader'

export interface FDCConfig {
  apiKey: string
  cacheInNeo4j: boolean
  autoSync: boolean
}

interface FDCConfigPanelProps {
  onConfigChange?: (config: FDCConfig) => void
}

export function FDCConfigPanel({ onConfigChange }: FDCConfigPanelProps) {
  const [config, setConfig] = useKV<FDCConfig>('fdc-config', {
    apiKey: FDC_CONSTANTS.DEFAULT_API_KEY,
    cacheInNeo4j: true,
    autoSync: false
  })

  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')

  useEffect(() => {
    if (config) {
      fdcService.setApiKey(config.apiKey)
      if (onConfigChange) {
        onConfigChange(config)
      }
    }
  }, [config, onConfigChange])

  const handleUpdateConfig = (field: keyof FDCConfig, value: any) => {
    setConfig((current) => ({
      ...current!,
      [field]: value
    }))
    setConnectionStatus('unknown')
  }

  const handleTestConnection = async () => {
    if (!config) return

    setTesting(true)
    setConnectionStatus('unknown')

    try {
      const results = await fdcService.searchFoods({
        query: 'apple',
        pageSize: 1
      })

      if (results && results.length > 0) {
        setConnectionStatus('connected')
        toast.success('Successfully connected to USDA FDC API')
      } else {
        setConnectionStatus('failed')
        toast.error('FDC API returned no results')
      }
    } catch (error) {
      setConnectionStatus('failed')
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to FDC API'
      toast.error(errorMessage)
      console.error(error)
    } finally {
      setTesting(false)
    }
  }

  const handleSaveConfig = () => {
    if (!config) return
    toast.success('FDC configuration saved')
  }

  const isUsingDemoKey = config?.apiKey === FDC_CONSTANTS.DEFAULT_API_KEY

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Database className="text-primary" size={20} weight="bold" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">USDA Food Data Central (FDC)</h3>
            <p className="text-sm text-muted-foreground">Configure integration with FDC nutrition database</p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="gap-2">
            <Gear size={16} weight="bold" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="loader" className="gap-2">
            <CloudArrowUp size={16} weight="bold" />
            Data Loader
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-0">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fdc-api-key">API Key</Label>
                  <Input
                    id="fdc-api-key"
                    type="text"
                    value={config?.apiKey || ''}
                    onChange={(e) => handleUpdateConfig('apiKey', e.target.value)}
                    placeholder="Enter your FDC API key"
                  />
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info size={14} className="mt-0.5 flex-shrink-0" />
                    <div>
                      {isUsingDemoKey ? (
                        <span className="text-amber-600">
                          Using DEMO_KEY (limited to 30 requests/hour). Get a free API key at{' '}
                          <a 
                            href="https://fdc.nal.usda.gov/api-key-signup.html" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline hover:text-primary"
                          >
                            fdc.nal.usda.gov
                          </a>
                        </span>
                      ) : (
                        <span>Using custom API key (1000 requests/hour)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="cache-neo4j" className="text-sm font-medium">
                      Cache in Neo4j
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Store FDC food data in Neo4j for offline access and graph queries
                    </p>
                  </div>
                  <Switch
                    id="cache-neo4j"
                    checked={config?.cacheInNeo4j || false}
                    onCheckedChange={(checked) => handleUpdateConfig('cacheInNeo4j', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-sync" className="text-sm font-medium">
                      Auto-sync Formulations
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically fetch FDC data when ingredients are added
                    </p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={config?.autoSync || false}
                    onCheckedChange={(checked) => handleUpdateConfig('autoSync', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection Status</span>
                  {connectionStatus === 'connected' && (
                    <Badge variant="default" className="gap-1.5 bg-green-500">
                      <CheckCircle size={14} weight="fill" />
                      Connected
                    </Badge>
                  )}
                  {connectionStatus === 'failed' && (
                    <Badge variant="destructive" className="gap-1.5">
                      <Warning size={14} weight="fill" />
                      Failed
                    </Badge>
                  )}
                  {connectionStatus === 'unknown' && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Info size={14} weight="fill" />
                      Not Tested
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-muted-foreground mb-1">API Endpoint</div>
                    <div className="font-mono text-[10px] truncate">{FDC_CONSTANTS.API_BASE_URL}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-muted-foreground mb-1">Rate Limit</div>
                    <div className="font-semibold">{isUsingDemoKey ? '30' : '1000'} req/hour</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleTestConnection}
                  disabled={testing || !config?.apiKey}
                  variant="outline"
                  className="flex-1"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  disabled={!config?.apiKey}
                  className="flex-1"
                >
                  Save Configuration
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 text-blue-900">About USDA FDC</h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  The USDA Food Data Central provides comprehensive nutrition data for foods. 
                  Integration allows automatic lookup of nutritional information, ingredient alternatives, 
                  and compliance data for formulations.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">170,000+ Foods</Badge>
                  <Badge variant="outline" className="text-xs">150+ Nutrients</Badge>
                  <Badge variant="outline" className="text-xs">Brand Name Foods</Badge>
                  <Badge variant="outline" className="text-xs">Foundation Foods</Badge>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="loader" className="space-y-0">
          <Neo4jDataLoader />
        </TabsContent>
      </Tabs>
    </div>
  )
}
