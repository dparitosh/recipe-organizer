import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { FDCConfigPanel } from './FDCConfigPanel'
import { 
  Database, 
  CloudArrowDown, 
  Cube, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeSlash,
  Info,
  Lightning,
  Warning
} from '@phosphor-icons/react'
import { neo4jManager } from '@/lib/managers/neo4j-manager'
import { plmClient } from '@/lib/api/plm'
import { mdgClient } from '@/lib/api/mdg'
import { Neo4jDriverConfig } from '@/lib/drivers/neo4j-driver'
import { toast } from 'sonner'

interface PLMConfig {
  baseUrl: string
  apiKey: string
  enabled: boolean
}

interface MDGConfig {
  baseUrl: string
  apiKey: string
  client: string
  plant: string
  enabled: boolean
}

const DEFAULT_NEO4J_CONFIG: Neo4jDriverConfig = {
  uri: '',
  username: '',
  password: '',
  database: 'neo4j'
}

const DEFAULT_PLM_CONFIG: PLMConfig = {
  baseUrl: import.meta.env.VITE_PLM_API_URL || 'https://plm.company.com/api',
  apiKey: '',
  enabled: false
}

const DEFAULT_MDG_CONFIG: MDGConfig = {
  baseUrl: import.meta.env.VITE_MDG_API_URL || 'https://sap.company.com/mdg/api',
  apiKey: '',
  client: import.meta.env.VITE_MDG_CLIENT || '100',
  plant: import.meta.env.VITE_MDG_PLANT || '1000',
  enabled: false
}

export function BackendConfigPanel() {
  const [neo4jConfig, setNeo4jConfig] = useKV<Neo4jDriverConfig>('neo4j-config', DEFAULT_NEO4J_CONFIG)
  const [plmConfig, setPlmConfig] = useKV<PLMConfig>('plm-config', DEFAULT_PLM_CONFIG)
  const [mdgConfig, setMdgConfig] = useKV<MDGConfig>('mdg-config', DEFAULT_MDG_CONFIG)
  
  const [neo4jMockMode, setNeo4jMockMode] = useKV<boolean>('neo4j-mock-mode', true)
  const [plmMockMode, setPlmMockMode] = useKV<boolean>('plm-mock-mode', true)
  const [mdgMockMode, setMdgMockMode] = useKV<boolean>('mdg-mock-mode', true)

  const [localNeo4jConfig, setLocalNeo4jConfig] = useState<Neo4jDriverConfig>(neo4jConfig || DEFAULT_NEO4J_CONFIG)
  const [localPlmConfig, setLocalPlmConfig] = useState<PLMConfig>(plmConfig || DEFAULT_PLM_CONFIG)
  const [localMdgConfig, setLocalMdgConfig] = useState<MDGConfig>(mdgConfig || DEFAULT_MDG_CONFIG)

  const [showNeo4jPassword, setShowNeo4jPassword] = useState(false)
  const [showPlmApiKey, setShowPlmApiKey] = useState(false)
  const [showMdgApiKey, setShowMdgApiKey] = useState(false)

  const [neo4jStatus, setNeo4jStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown')
  const [plmStatus, setPlmStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown')
  const [mdgStatus, setMdgStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown')

  const [testLatencies, setTestLatencies] = useState({
    neo4j: 0,
    plm: 0,
    mdg: 0
  })

  useEffect(() => {
    neo4jManager.setMockMode(neo4jMockMode ?? true)
    plmClient.setMockMode(plmMockMode ?? true)
    mdgClient.setMockMode(mdgMockMode ?? true)
  }, [neo4jMockMode, plmMockMode, mdgMockMode])

  const testNeo4jConnection = async () => {
    if (!localNeo4jConfig.uri || !localNeo4jConfig.username || !localNeo4jConfig.password) {
      toast.error('Please fill in all Neo4j connection fields')
      return
    }

    setNeo4jStatus('testing')
    const startTime = Date.now()

    try {
      const isConnected = await neo4jManager.testConnection(localNeo4jConfig)
      const latency = Date.now() - startTime

      if (isConnected) {
        setNeo4jStatus('connected')
        setTestLatencies(prev => ({ ...prev, neo4j: latency }))
        toast.success(`Neo4j connected! (${latency}ms)`)
        await neo4jManager.connect(localNeo4jConfig)
        setNeo4jMockMode(() => false)
      } else {
        setNeo4jStatus('failed')
        toast.error('Neo4j connection failed')
      }
    } catch (error) {
      setNeo4jStatus('failed')
      toast.error(`Neo4j error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testPLMConnection = async () => {
    if (!localPlmConfig.baseUrl || !localPlmConfig.apiKey) {
      toast.error('Please fill in PLM URL and API key')
      return
    }

    setPlmStatus('testing')
    const startTime = Date.now()

    try {
      const response = await fetch(`${localPlmConfig.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${localPlmConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const latency = Date.now() - startTime

      if (response.ok) {
        setPlmStatus('connected')
        setTestLatencies(prev => ({ ...prev, plm: latency }))
        toast.success(`PLM connected! (${latency}ms)`)
        setPlmMockMode(() => false)
      } else {
        setPlmStatus('failed')
        toast.error(`PLM connection failed: ${response.statusText}`)
      }
    } catch (error) {
      setPlmStatus('failed')
      toast.error(`PLM error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testMDGConnection = async () => {
    if (!localMdgConfig.baseUrl || !localMdgConfig.apiKey) {
      toast.error('Please fill in MDG URL and API key')
      return
    }

    setMdgStatus('testing')
    const startTime = Date.now()

    try {
      const response = await fetch(`${localMdgConfig.baseUrl}/health?client=${localMdgConfig.client}`, {
        headers: {
          'Authorization': `Bearer ${localMdgConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const latency = Date.now() - startTime

      if (response.ok) {
        setMdgStatus('connected')
        setTestLatencies(prev => ({ ...prev, mdg: latency }))
        toast.success(`SAP MDG connected! (${latency}ms)`)
        setMdgMockMode(() => false)
      } else {
        setMdgStatus('failed')
        toast.error(`MDG connection failed: ${response.statusText}`)
      }
    } catch (error) {
      setMdgStatus('failed')
      toast.error(`MDG error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const saveNeo4jConfig = () => {
    setNeo4jConfig(localNeo4jConfig)
    toast.success('Neo4j configuration saved')
  }

  const savePlmConfig = () => {
    setPlmConfig(localPlmConfig)
    toast.success('PLM configuration saved')
  }

  const saveMdgConfig = () => {
    setMdgConfig(localMdgConfig)
    toast.success('SAP MDG configuration saved')
  }

  const getStatusBadge = (status: string, latency?: number) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500 text-white gap-1">
            <CheckCircle size={14} weight="bold" />
            Connected {latency ? `(${latency}ms)` : ''}
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle size={14} weight="bold" />
            Failed
          </Badge>
        )
      case 'testing':
        return (
          <Badge variant="outline" className="gap-1">
            <Lightning size={14} weight="bold" />
            Testing...
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Warning size={14} weight="bold" />
            Not Tested
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure your backend services to enable real-time data synchronization. 
          Leave mock mode enabled for development without backend access.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="neo4j" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="neo4j" className="gap-2">
            <Database size={16} weight="bold" />
            Neo4j
          </TabsTrigger>
          <TabsTrigger value="fdc" className="gap-2">
            <Database size={16} weight="bold" />
            USDA FDC
          </TabsTrigger>
          <TabsTrigger value="plm" className="gap-2">
            <CloudArrowDown size={16} weight="bold" />
            PLM
          </TabsTrigger>
          <TabsTrigger value="mdg" className="gap-2">
            <Cube size={16} weight="bold" />
            SAP MDG
          </TabsTrigger>
        </TabsList>

        <TabsContent value="neo4j" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database size={24} className="text-primary" weight="bold" />
                    Neo4j Graph Database
                  </CardTitle>
                  <CardDescription>
                    Connect to Neo4j for graph-based relationship management
                  </CardDescription>
                </div>
                {getStatusBadge(neo4jStatus, testLatencies.neo4j)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={neo4jMockMode ?? true}
                    onCheckedChange={(checked) => {
                      setNeo4jMockMode(() => checked)
                      neo4jManager.setMockMode(checked)
                    }}
                  />
                  <div>
                    <div className="font-semibold">Mock Mode</div>
                    <div className="text-sm text-muted-foreground">
                      Use simulated data without real connections
                    </div>
                  </div>
                </div>
                <Badge variant={neo4jMockMode ? 'secondary' : 'default'}>
                  {neo4jMockMode ? 'Mock Data' : 'Real Connection'}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="neo4j-uri">Connection URI</Label>
                  <Input
                    id="neo4j-uri"
                    placeholder="neo4j+s://xxxxx.databases.neo4j.io"
                    value={localNeo4jConfig.uri}
                    onChange={(e) => setLocalNeo4jConfig({ ...localNeo4jConfig, uri: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neo4j-username">Username</Label>
                    <Input
                      id="neo4j-username"
                      placeholder="neo4j"
                      value={localNeo4jConfig.username}
                      onChange={(e) => setLocalNeo4jConfig({ ...localNeo4jConfig, username: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="neo4j-database">Database</Label>
                    <Input
                      id="neo4j-database"
                      placeholder="neo4j"
                      value={localNeo4jConfig.database}
                      onChange={(e) => setLocalNeo4jConfig({ ...localNeo4jConfig, database: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="neo4j-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="neo4j-password"
                      type={showNeo4jPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={localNeo4jConfig.password}
                      onChange={(e) => setLocalNeo4jConfig({ ...localNeo4jConfig, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowNeo4jPassword(!showNeo4jPassword)}
                    >
                      {showNeo4jPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={testNeo4jConnection} disabled={neo4jStatus === 'testing'} className="flex-1">
                  <Lightning size={18} className="mr-2" weight="bold" />
                  Test Connection
                </Button>
                <Button onClick={saveNeo4jConfig} variant="outline">
                  Save Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fdc" className="space-y-4">
          <FDCConfigPanel />
        </TabsContent>

        <TabsContent value="plm" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CloudArrowDown size={24} className="text-primary" weight="bold" />
                    PLM System
                  </CardTitle>
                  <CardDescription>
                    Connect to Product Lifecycle Management for material specifications
                  </CardDescription>
                </div>
                {getStatusBadge(plmStatus, testLatencies.plm)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={plmMockMode ?? true}
                    onCheckedChange={(checked) => {
                      setPlmMockMode(() => checked)
                      plmClient.setMockMode(checked)
                    }}
                  />
                  <div>
                    <div className="font-semibold">Mock Mode</div>
                    <div className="text-sm text-muted-foreground">
                      Use simulated PLM data
                    </div>
                  </div>
                </div>
                <Badge variant={plmMockMode ? 'secondary' : 'default'}>
                  {plmMockMode ? 'Mock Data' : 'Real Connection'}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="plm-url">PLM API Base URL</Label>
                  <Input
                    id="plm-url"
                    placeholder="https://plm.company.com/api"
                    value={localPlmConfig.baseUrl}
                    onChange={(e) => setLocalPlmConfig({ ...localPlmConfig, baseUrl: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="plm-api-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="plm-api-key"
                      type={showPlmApiKey ? 'text' : 'password'}
                      placeholder="Enter API key"
                      value={localPlmConfig.apiKey}
                      onChange={(e) => setLocalPlmConfig({ ...localPlmConfig, apiKey: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPlmApiKey(!showPlmApiKey)}
                    >
                      {showPlmApiKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={localPlmConfig.enabled}
                    onCheckedChange={(checked) => setLocalPlmConfig({ ...localPlmConfig, enabled: checked })}
                  />
                  <Label>Enable PLM Integration</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={testPLMConnection} disabled={plmStatus === 'testing'} className="flex-1">
                  <Lightning size={18} className="mr-2" weight="bold" />
                  Test Connection
                </Button>
                <Button onClick={savePlmConfig} variant="outline">
                  Save Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mdg" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cube size={24} className="text-primary" weight="bold" />
                    SAP Master Data Governance
                  </CardTitle>
                  <CardDescription>
                    Connect to SAP MDG for material master data management
                  </CardDescription>
                </div>
                {getStatusBadge(mdgStatus, testLatencies.mdg)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={mdgMockMode ?? true}
                    onCheckedChange={(checked) => {
                      setMdgMockMode(() => checked)
                      mdgClient.setMockMode(checked)
                    }}
                  />
                  <div>
                    <div className="font-semibold">Mock Mode</div>
                    <div className="text-sm text-muted-foreground">
                      Use simulated SAP MDG data
                    </div>
                  </div>
                </div>
                <Badge variant={mdgMockMode ? 'secondary' : 'default'}>
                  {mdgMockMode ? 'Mock Data' : 'Real Connection'}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="mdg-url">SAP MDG API Base URL</Label>
                  <Input
                    id="mdg-url"
                    placeholder="https://sap.company.com/mdg/api"
                    value={localMdgConfig.baseUrl}
                    onChange={(e) => setLocalMdgConfig({ ...localMdgConfig, baseUrl: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="mdg-api-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="mdg-api-key"
                      type={showMdgApiKey ? 'text' : 'password'}
                      placeholder="Enter API key"
                      value={localMdgConfig.apiKey}
                      onChange={(e) => setLocalMdgConfig({ ...localMdgConfig, apiKey: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowMdgApiKey(!showMdgApiKey)}
                    >
                      {showMdgApiKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mdg-client">SAP Client</Label>
                    <Input
                      id="mdg-client"
                      placeholder="100"
                      value={localMdgConfig.client}
                      onChange={(e) => setLocalMdgConfig({ ...localMdgConfig, client: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mdg-plant">Plant Code</Label>
                    <Input
                      id="mdg-plant"
                      placeholder="1000"
                      value={localMdgConfig.plant}
                      onChange={(e) => setLocalMdgConfig({ ...localMdgConfig, plant: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={localMdgConfig.enabled}
                    onCheckedChange={(checked) => setLocalMdgConfig({ ...localMdgConfig, enabled: checked })}
                  />
                  <Label>Enable SAP MDG Integration</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={testMDGConnection} disabled={mdgStatus === 'testing'} className="flex-1">
                  <Lightning size={18} className="mr-2" weight="bold" />
                  Test Connection
                </Button>
                <Button onClick={saveMdgConfig} variant="outline">
                  Save Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
