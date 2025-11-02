import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Database, CheckCircle, Warning, Eye, EyeSlash } from '@phosphor-icons/react'

export interface Neo4jConfig {
  uri: string
  username: string
  password: string
  database: string
  mockMode: boolean
}

interface Neo4jConfigPanelProps {
  onConfigChange?: (config: Neo4jConfig) => void
}

export function Neo4jConfigPanel({ onConfigChange }: Neo4jConfigPanelProps) {
  const [config, setConfig] = useKV<Neo4jConfig>('neo4j-config', {
    uri: 'neo4j+s://2cccd05b.databases.neo4j.io',
    username: 'neo4j',
    password: 'tcs12345',
    database: 'neo4j',
    mockMode: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')

  useEffect(() => {
    if (config && onConfigChange) {
      onConfigChange(config)
    }
  }, [config, onConfigChange])

  const handleUpdateConfig = (field: keyof Neo4jConfig, value: any) => {
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
      const response = await fetch('/api/neo4j/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: config.uri,
          username: config.username,
          password: config.password,
          database: config.database
        })
      })

      if (response.ok) {
        setConnectionStatus('connected')
        toast.success('Connected to Neo4j successfully')
      } else {
        setConnectionStatus('failed')
        const error = await response.text()
        toast.error(`Connection failed: ${error}`)
      }
    } catch (error) {
      setConnectionStatus('failed')
      toast.error('Connection test failed')
      console.error(error)
    } finally {
      setTesting(false)
    }
  }

  const handleSaveConfig = () => {
    toast.success('Neo4j configuration saved')
    if (onConfigChange && config) {
      onConfigChange(config)
    }
  }

  if (!config) return null

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={24} className="text-primary" weight="bold" />
          <h3 className="font-semibold text-lg">Neo4j Configuration</h3>
        </div>
        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle size={18} weight="fill" />
            <span>Connected</span>
          </div>
        )}
        {connectionStatus === 'failed' && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <Warning size={18} weight="fill" />
            <span>Connection Failed</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Mock Mode</Label>
            <p className="text-xs text-muted-foreground">Use mock data instead of real Neo4j connection</p>
          </div>
          <Switch
            checked={config.mockMode}
            onCheckedChange={(checked) => handleUpdateConfig('mockMode', checked)}
          />
        </div>

        {!config.mockMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="neo4j-uri">Connection URI</Label>
              <Input
                id="neo4j-uri"
                value={config.uri}
                onChange={(e) => handleUpdateConfig('uri', e.target.value)}
                placeholder="neo4j+s://xxxxx.databases.neo4j.io"
              />
              <p className="text-xs text-muted-foreground">
                Use neo4j+s:// for secure connections, bolt:// for local
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-username">Username</Label>
              <Input
                id="neo4j-username"
                value={config.username}
                onChange={(e) => handleUpdateConfig('username', e.target.value)}
                placeholder="neo4j"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-password">Password</Label>
              <div className="relative">
                <Input
                  id="neo4j-password"
                  type={showPassword ? 'text' : 'password'}
                  value={config.password}
                  onChange={(e) => handleUpdateConfig('password', e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-database">Database</Label>
              <Input
                id="neo4j-database"
                value={config.database}
                onChange={(e) => handleUpdateConfig('database', e.target.value)}
                placeholder="neo4j"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleTestConnection}
                disabled={testing}
                variant="outline"
                className="flex-1"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button onClick={handleSaveConfig} className="flex-1">
                Save Configuration
              </Button>
            </div>
          </>
        )}

        {config.mockMode && (
          <div className="bg-accent/20 border border-accent rounded-lg p-4">
            <p className="text-sm text-accent-foreground">
              Mock mode is enabled. The application will use simulated data for all Neo4j operations.
              Switch to real mode to connect to your Neo4j database.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
