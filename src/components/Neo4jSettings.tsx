import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Database, CheckCircle, XCircle, Info, Eye, EyeSlash, Warning, Lightning } from '@phosphor-icons/react'
import { neo4jClient, Neo4jConnectionConfig } from '@/lib/api/neo4j'
import { toast } from 'sonner'

const DEFAULT_CONFIG: Neo4jConnectionConfig = {
  uri: '',
  username: '',
  password: '',
  database: 'neo4j'
}

export function Neo4jSettings() {
  const [savedConfig, setSavedConfig] = useKV<Neo4jConnectionConfig>('neo4j-config', DEFAULT_CONFIG)
  
  const [useMockMode, setUseMockMode] = useKV<boolean>('neo4j-mock-mode', true)
  const [config, setConfig] = useState<Neo4jConnectionConfig>(savedConfig || DEFAULT_CONFIG)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [connectionError, setConnectionError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [testDetails, setTestDetails] = useState<{
    latency?: number
    serverVersion?: string
    serverInfo?: string
  }>({})

  useEffect(() => {
    neo4jClient.setMockMode(useMockMode ?? true)
  }, [useMockMode])

  const handleTestConnection = async () => {
    if (!config.uri || !config.username || !config.password) {
      toast.error('Please fill in all connection fields')
      return
    }

    setTesting(true)
    setConnectionStatus('unknown')
    setConnectionError('')
    setTestDetails({})

    const startTime = Date.now()

    try {
      await neo4jClient.setConfig(config)
      neo4jClient.setMockMode(false)
      
      const isConnected = await neo4jClient.testConnection()
      const latency = Date.now() - startTime
      
      if (isConnected) {
        setConnectionStatus('connected')
        setTestDetails({ latency })
        toast.success(`Connection successful! (${latency}ms)`)
      } else {
        setConnectionStatus('failed')
        setConnectionError('Unable to establish connection')
        toast.error('Connection failed')
        neo4jClient.setMockMode(true)
      }
    } catch (error) {
      setConnectionStatus('failed')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setConnectionError(errorMessage)
      toast.error(`Connection error: ${errorMessage}`)
      neo4jClient.setMockMode(true)
    } finally {
      setTesting(false)
    }
  }

  const handleSaveConfig = async () => {
    setSavedConfig(config)
    await neo4jClient.setConfig(config)
    toast.success('Configuration saved')
  }

  const handleToggleMockMode = (enabled: boolean) => {
    setUseMockMode(() => enabled)
    neo4jClient.setMockMode(enabled)
    if (enabled) {
      setConnectionStatus('unknown')
      toast.info('Mock mode enabled')
    } else {
      toast.info('Mock mode disabled - connect to Neo4j')
    }
  }

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Database className="text-primary" size={24} weight="bold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Neo4j Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure your Neo4j database connection and settings
            </p>
          </div>
          <Badge variant={useMockMode ? 'secondary' : connectionStatus === 'connected' ? 'default' : 'outline'}>
            {useMockMode ? 'Mock Mode' : connectionStatus === 'connected' ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Mock Mode</Label>
              <p className="text-xs text-muted-foreground">
                Use mock data instead of real database connection
              </p>
            </div>
            <Switch
              checked={useMockMode || false}
              onCheckedChange={handleToggleMockMode}
            />
          </div>

          {useMockMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
              <Warning className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} weight="fill" />
              <div className="text-xs text-yellow-800">
                <p className="font-medium mb-1">Mock Mode Active</p>
                <p>
                  The application is using simulated mock data. Disable mock mode and configure
                  your Neo4j connection to use real data.
                </p>
              </div>
            </div>
          )}

          {!useMockMode && (
            <>
              <Separator />

              <div className="space-y-6">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Database size={16} weight="bold" />
                  Connection Settings
                </h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="uri" className="flex items-center gap-2">
                      Connection URI
                      <span className="text-xs text-muted-foreground font-normal">(required)</span>
                    </Label>
                    <Input
                      id="uri"
                      type="text"
                      placeholder="neo4j+s://xxxxx.databases.neo4j.io"
                      value={config.uri}
                      onChange={(e) => setConfig({ ...config, uri: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use <code className="px-1 py-0.5 bg-muted rounded">neo4j+s://</code> for secure connections or <code className="px-1 py-0.5 bg-muted rounded">neo4j://</code> for local instances
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="flex items-center gap-2">
                        Username
                        <span className="text-xs text-muted-foreground font-normal">(required)</span>
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="neo4j"
                        value={config.username}
                        onChange={(e) => setConfig({ ...config, username: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="database" className="flex items-center gap-2">
                        Database
                        <span className="text-xs text-muted-foreground font-normal">(required)</span>
                      </Label>
                      <Input
                        id="database"
                        type="text"
                        placeholder="neo4j"
                        value={config.database}
                        onChange={(e) => setConfig({ ...config, database: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      Password
                      <span className="text-xs text-muted-foreground font-normal">(required)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={config.password}
                        onChange={(e) => setConfig({ ...config, password: e.target.value })}
                        className="pr-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs gap-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <>
                            <EyeSlash size={14} />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye size={14} />
                            Show
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Connection Testing</h4>
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testing || !config.uri || !config.username || !config.password}
                    variant="outline"
                    className="gap-2"
                  >
                    <Lightning size={16} weight="bold" />
                    {testing ? 'Testing Connection...' : 'Test Connection'}
                  </Button>

                  <Button
                    onClick={handleSaveConfig}
                    disabled={!config.uri || !config.username || !config.password}
                    className="gap-2"
                  >
                    <Database size={16} weight="bold" />
                    Save Configuration
                  </Button>
                </div>

                {connectionStatus !== 'unknown' && (
                  <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                    connectionStatus === 'connected' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {connectionStatus === 'connected' ? (
                      <>
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} weight="fill" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold text-green-900">Connection Successful</p>
                          {testDetails.latency && (
                            <p className="text-xs text-green-700">
                              Latency: <span className="font-mono">{testDetails.latency}ms</span>
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} weight="fill" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold text-red-900">Connection Failed</p>
                          {connectionError && (
                            <p className="text-xs text-red-700 font-mono">{connectionError}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Current Configuration</h4>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">URI:</span>
                    <span className="text-foreground truncate ml-4 max-w-[60%]">{config.uri || '(not set)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <span className="text-foreground">{config.username || '(not set)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Password:</span>
                    <span className="text-foreground">{config.password ? '••••••••' : '(not set)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Database:</span>
                    <span className="text-foreground">{config.database || '(not set)'}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver Status:</span>
                    <span className={`font-semibold ${neo4jClient.isConnected() ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {neo4jClient.isConnected() ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className={`font-semibold ${neo4jClient.isMockMode() ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {neo4jClient.isMockMode() ? 'Mock' : 'Live'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} weight="fill" />
          <div className="space-y-3 flex-1">
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Neo4j JavaScript Driver</p>
              <p className="text-xs text-blue-800">
                This application uses the official Neo4j JavaScript Driver (<code className="px-1 py-0.5 bg-blue-100 rounded">neo4j-driver</code>) for optimal performance
                with connection pooling, automatic session management, and full Cypher query support.
              </p>
            </div>
            
            <Separator className="bg-blue-200" />
            
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">GenAI Plugin Support</p>
              <p className="text-xs text-blue-800 mb-2">
                If your Neo4j instance has the GenAI plugin installed, you can use natural
                language queries to generate and execute Cypher queries automatically.
              </p>
              <p className="text-xs text-blue-600">
                Learn more: <a 
                  href="https://neo4j.com/labs/genai-ecosystem/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-800 font-medium"
                >
                  Neo4j GenAI Documentation
                </a>
              </p>
            </div>

            <Separator className="bg-blue-200" />

            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Driver Features</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Automatic connection pooling</li>
                <li>Session lifecycle management</li>
                <li>Full Cypher query language support</li>
                <li>Transaction management (READ/WRITE)</li>
                <li>Secure connections (TLS/SSL)</li>
                <li>Multi-database support</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
