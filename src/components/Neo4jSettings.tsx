import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Database, CheckCircle, XCircle, Info } from '@phosphor-icons/react'
import { neo4jClient, Neo4jConnectionConfig } from '@/lib/api/neo4j'
import { toast } from 'sonner'

export function Neo4jSettings() {
  const [savedConfig, setSavedConfig] = useKV<Neo4jConnectionConfig>('neo4j-config', {
    uri: 'neo4j+s://2cccd05b.databases.neo4j.io',
    username: 'neo4j',
    password: 'tcs12345',
    database: 'neo4j'
  })
  
  const [useMockMode, setUseMockMode] = useKV<boolean>('neo4j-mock-mode', true)
  const [config, setConfig] = useState<Neo4jConnectionConfig>(
    savedConfig || {
      uri: 'neo4j+s://2cccd05b.databases.neo4j.io',
      username: 'neo4j',
      password: 'tcs12345',
      database: 'neo4j'
    }
  )
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    neo4jClient.setMockMode(useMockMode ?? true)
  }, [useMockMode])

  const handleTestConnection = async () => {
    setTesting(true)
    setConnectionStatus('unknown')

    try {
      await neo4jClient.setConfig(config)
      neo4jClient.setMockMode(false)
      
      const isConnected = await neo4jClient.testConnection()
      
      if (isConnected) {
        setConnectionStatus('connected')
        toast.success('Connection successful!')
      } else {
        setConnectionStatus('failed')
        toast.error('Connection failed')
        neo4jClient.setMockMode(true)
      }
    } catch (error) {
      setConnectionStatus('failed')
      toast.error(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Database className="text-primary" size={24} weight="bold" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Neo4j Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure your Neo4j database connection
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Mock Mode</Label>
          <p className="text-xs text-muted-foreground">
            Use mock data instead of real database
          </p>
        </div>
        <Switch
          checked={useMockMode || false}
          onCheckedChange={handleToggleMockMode}
        />
      </div>

      {!useMockMode && (
        <>
          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uri">Connection URI</Label>
              <Input
                id="uri"
                type="text"
                placeholder="neo4j+s://xxxxx.databases.neo4j.io"
                value={config.uri}
                onChange={(e) => setConfig({ ...config, uri: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Example: neo4j+s://2cccd05b.databases.neo4j.io
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="neo4j"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                type="text"
                placeholder="neo4j"
                value={config.database}
                onChange={(e) => setConfig({ ...config, database: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Button
              onClick={handleTestConnection}
              disabled={testing}
              variant="outline"
              className="gap-2"
            >
              <Database size={16} weight="bold" />
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>

            <Button
              onClick={handleSaveConfig}
              className="gap-2"
            >
              Save Configuration
            </Button>

            {connectionStatus !== 'unknown' && (
              <div className="flex items-center gap-2 ml-auto">
                {connectionStatus === 'connected' ? (
                  <>
                    <CheckCircle className="text-green-600" size={20} weight="fill" />
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-600" size={20} weight="fill" />
                    <span className="text-sm font-medium text-red-600">Failed</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-accent/30 rounded-lg p-4 flex gap-3">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={20} weight="fill" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Connection Details</p>
              <p>URI: {config.uri}</p>
              <p>Username: {config.username}</p>
              <p>Database: {config.database}</p>
            </div>
          </div>
        </>
      )}

      {useMockMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <Info className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} weight="fill" />
          <div className="text-xs text-yellow-800">
            <p className="font-medium mb-1">Mock Mode Active</p>
            <p>
              The application is using mock data. Disable mock mode and configure
              your Neo4j connection to use real data.
            </p>
          </div>
        </div>
      )}

      {!useMockMode && connectionStatus === 'connected' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} weight="fill" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Neo4j Driver Connected</p>
              <p>
                Using official Neo4j JavaScript Driver (neo4j-driver) for optimal performance
                with connection pooling and automatic session management.
              </p>
            </div>
          </div>
          
          <Separator className="bg-blue-200" />
          
          <div className="text-xs text-blue-800 space-y-2">
            <p className="font-medium">GenAI Plugin Support</p>
            <p>
              If your Neo4j instance has the GenAI plugin installed, you can use natural
              language queries to generate and execute Cypher queries automatically.
            </p>
            <p className="text-[10px] mt-2 text-blue-600">
              Learn more: <a 
                href="https://neo4j.com/labs/genai-ecosystem/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                Neo4j GenAI Documentation
              </a>
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
