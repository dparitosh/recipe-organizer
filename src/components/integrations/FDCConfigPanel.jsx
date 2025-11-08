import { useEffect, useRef, useState } from 'react'
import { useRecoilState } from 'recoil'
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
import { envService } from '@/lib/services/env-service'
import { FDC_CONSTANTS } from '@/lib/constants'
import { Neo4jDataLoader } from './Neo4jDataLoader'
import { useAppConfig } from '@/lib/config/app-config'
import { fdcConfigAtom, DEFAULT_FDC_CONFIG } from '@/state/atoms'

export function FDCConfigPanel({ onConfigChange }) {
  const [config, setConfig] = useRecoilState(fdcConfigAtom)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('unknown')
  const [saving, setSaving] = useState(false)
  const [appConfig] = useAppConfig()
  const initializedFromEnv = useRef(false)

  useEffect(() => {
    if (appConfig?.backend?.apiUrl) {
      fdcService.setBackendUrl(appConfig.backend.apiUrl)
    }
  }, [appConfig?.backend?.apiUrl])

  useEffect(() => {
    if (initializedFromEnv.current) {
      return
    }

    initializedFromEnv.current = true

    const loadBackendDefaults = async () => {
      try {
        const response = await envService.getEnvSettings()
        const envValues = response?.values || {}
        const backendApiKey = envValues.FDC_API_KEY ?? ''

        if (backendApiKey) {
          setConfig((current) => ({
            ...DEFAULT_FDC_CONFIG,
            ...(current ?? {}),
            apiKey: current?.apiKey || backendApiKey,
          }))
        }
      } catch (error) {
        console.warn('Failed to load backend FDC settings', error)
      }
    }

    loadBackendDefaults()
  }, [setConfig])

  useEffect(() => {
    if (config) {
      fdcService.setApiKey(config.apiKey)
      if (onConfigChange) {
        onConfigChange(config)
      }
    }
  }, [config, onConfigChange])

  const handleUpdateConfig = (field, value) => {
    setConfig((current) => ({
      ...current,
      [field]: value,
    }))
    setConnectionStatus('unknown')
  }

  const handleTestConnection = async () => {
    if (!config) return

    setTesting(true)
    setConnectionStatus('unknown')

    try {
      const result = await fdcService.searchFoods({
        query: 'apple',
        pageSize: 1,
      })

      if (result?.foods && result.foods.length > 0) {
        setConnectionStatus('connected')
        toast.success('Successfully connected to USDA FDC API via backend')
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

  const handleSaveConfig = async () => {
    if (!config) return

    try {
      setSaving(true)

      await envService.updateEnvSettings({
        FDC_API_KEY: config.apiKey || '',
      })
      toast.success('FDC configuration saved to backend environment')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to persist FDC configuration'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const isUsingDemoKey = !config?.apiKey

  const getStatusBadge = () => {
    if (connectionStatus === 'connected') {
      return (
        <Badge variant="default" className="gap-1.5 bg-green-500">
          <CheckCircle size={14} weight="fill" />
          Connected
        </Badge>
      )
    }

    if (connectionStatus === 'failed') {
      return (
        <Badge variant="destructive" className="gap-1.5">
          <Warning size={14} weight="fill" />
          Failed
        </Badge>
      )
    }

    return (
      <Badge variant="secondary" className="gap-1.5">
        <Info size={14} weight="fill" />
        Not Tested
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Database className="text-primary" size={20} weight="bold" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">USDA Food Data Central (FDC)</h3>
            <p className="text-sm text-muted-foreground">
              Configure integration with FDC nutrition database
            </p>
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

        <TabsContent value="config">
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
                          Provide your USDA FDC API key to enable backend ingestion. Request a free key at{' '}
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
                  {getStatusBadge()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-muted-foreground mb-1">API Endpoint</div>
                    <div className="font-mono text-[10px] truncate">{FDC_CONSTANTS.API_BASE_URL}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-muted-foreground mb-1">Rate Limit</div>
                    <div className="font-semibold">{isUsingDemoKey ? 'Requires API key' : '1000 req/hour'}</div>
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
                <Button onClick={handleSaveConfig} disabled={saving || !config?.apiKey} className="flex-1">
                  {saving ? 'Saving...' : 'Save Configuration'}
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
                  <Badge variant="outline" className="text-xs">
                    170,000+ Foods
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    150+ Nutrients
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Brand Name Foods
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Foundation Foods
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="loader">
          <Neo4jDataLoader />
        </TabsContent>
      </Tabs>
    </div>
  )
}
