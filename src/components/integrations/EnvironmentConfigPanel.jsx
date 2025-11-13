import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CloudArrowUp,
  Eye,
  EyeSlash,
  FloppyDiskBack,
  ArrowCounterClockwise,
  Info,
  Database,
  Sparkle,
  Factory,
  TreeStructure,
  Globe,
  Lightning,
  CheckCircle,
  Warning,
  Wine,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { envService } from '@/lib/services/env-service'
import { useAppConfig } from '@/lib/config/app-config'
import { fdcService } from '@/lib/services/fdc-service'

const FIELD_DEFINITIONS = [
  {
    key: 'GENAI_PROVIDER',
    label: 'GenAI Provider',
    description: 'Set preferred GenAI provider (neo4j-plugin, azure-openai, openai, ollama)',
    type: 'text',
    placeholder: 'neo4j-plugin',
    group: 'platform',
  },
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    description: 'API key used when connecting to OpenAI hosted models',
    type: 'secret',
    placeholder: 'sk-...',
    group: 'platform',
  },
  {
    key: 'AZURE_OPENAI_ENDPOINT',
    label: 'Azure OpenAI Endpoint',
    description: 'Endpoint URL for your Azure OpenAI resource',
    type: 'text',
    placeholder: 'https://your-resource.openai.azure.com',
    group: 'platform',
  },
  {
    key: 'AZURE_OPENAI_DEPLOYMENT',
    label: 'Azure OpenAI Deployment',
    description: 'Deployment name configured for your Azure OpenAI model',
    type: 'text',
    placeholder: 'gpt-4o-mini',
    group: 'platform',
  },
  {
    key: 'AZURE_OPENAI_API_KEY',
    label: 'Azure OpenAI API Key',
    description: 'Primary key for the Azure OpenAI resource',
    type: 'secret',
    placeholder: 'az-...',
    group: 'platform',
  },
  {
    key: 'AZURE_OPENAI_API_VERSION',
    label: 'Azure OpenAI API Version',
    description: 'API version required for Azure OpenAI requests',
    type: 'text',
    placeholder: '2024-08-01-preview',
    group: 'platform',
  },
  {
    key: 'DEBUG',
    label: 'Debug Mode',
    description: 'Enable verbose logging and development tooling',
    type: 'boolean',
    group: 'platform',
  },
  {
    key: 'DISABLE_API_KEY_SECURITY',
    label: 'Disable API Key Checks',
    description: 'Allow unsecured access to backend endpoints (development use only)',
    type: 'boolean',
    group: 'platform',
  },
  {
    key: 'NEO4J_URI',
    label: 'Neo4j URI',
    description: 'Bolt or Neo4j Aura connection URL',
    type: 'text',
    placeholder: 'neo4j+s://xxxxx.databases.neo4j.io',
    group: 'neo4j',
  },
  {
    key: 'NEO4J_USER',
    label: 'Neo4j Username',
    description: 'Account used for database authentication',
    type: 'text',
    placeholder: 'neo4j',
    group: 'neo4j',
  },
  {
    key: 'NEO4J_PASSWORD',
    label: 'Neo4j Password',
    description: 'Stored securely in env.local.json',
    type: 'secret',
    placeholder: 'Enter password',
    group: 'neo4j',
  },
  {
    key: 'NEO4J_DATABASE',
    label: 'Neo4j Database',
    description: 'Target database within the instance',
    type: 'text',
    placeholder: 'neo4j',
    group: 'neo4j',
  },
  {
    key: 'FDC_API_BASE_URL',
    label: 'FDC API Base URL',
    description: 'Upstream USDA FoodData Central endpoint',
    type: 'text',
    placeholder: 'https://api.nal.usda.gov/fdc/v1',
    group: 'fdc',
  },
  {
    key: 'FDC_API_KEY',
    label: 'FDC API Key',
    description: 'Backend default API key if frontend does not supply one',
    type: 'secret',
    placeholder: 'Enter USDA API key',
    group: 'fdc',
  },
  {
    key: 'FDC_REQUEST_TIMEOUT',
    label: 'FDC Timeout (seconds)',
    description: 'Request timeout applied by backend service',
    type: 'number',
    min: 5,
    max: 120,
    group: 'fdc',
  },
  {
    key: 'OLLAMA_BASE_URL',
    label: 'Ollama Base URL',
    description: 'Endpoint for on-prem AI inferencing (if enabled)',
    type: 'text',
    placeholder: 'http://localhost:11434',
    group: 'ollama',
  },
  {
    key: 'OLLAMA_MODEL',
    label: 'Ollama Model',
    description: 'Model identifier used for local generation',
    type: 'text',
    placeholder: 'llama2',
    group: 'ollama',
  },
  {
    key: 'PLM_API_BASE_URL',
    label: 'PLM API Base URL',
    description: 'Product lifecycle management endpoint URL',
    type: 'text',
    placeholder: 'https://plm.company.com/api',
    group: 'plm',
  },
  {
    key: 'PLM_API_KEY',
    label: 'PLM API Key',
    description: 'Bearer token or API key used when calling the PLM service',
    type: 'secret',
    placeholder: 'Enter PLM API key',
    group: 'plm',
  },
  {
    key: 'PLM_REQUEST_TIMEOUT',
    label: 'PLM Timeout (ms)',
    description: 'Request timeout applied for PLM integration',
    type: 'number',
    min: 1000,
    max: 60000,
    group: 'plm',
  },
  {
    key: 'PLM_ENABLED',
    label: 'Enable PLM Integration',
    description: 'Toggle to enable or disable PLM connectivity from the backend',
    type: 'boolean',
    group: 'plm',
  },
  {
    key: 'MDG_API_BASE_URL',
    label: 'SAP MDG API Base URL',
    description: 'Master data governance API endpoint',
    type: 'text',
    placeholder: 'https://sap.company.com/mdg/api',
    group: 'mdg',
  },
  {
    key: 'MDG_API_KEY',
    label: 'SAP MDG API Key',
    description: 'Token used to authenticate against SAP MDG',
    type: 'secret',
    placeholder: 'Enter SAP MDG API key',
    group: 'mdg',
  },
  {
    key: 'MDG_CLIENT',
    label: 'SAP Client',
    description: 'SAP client for MDG integration',
    type: 'text',
    placeholder: '100',
    group: 'mdg',
  },
  {
    key: 'MDG_PLANT',
    label: 'Plant',
    description: 'Default SAP plant identifier',
    type: 'text',
    placeholder: '1000',
    group: 'mdg',
  },
  {
    key: 'MDG_ENABLED',
    label: 'Enable SAP MDG Integration',
    description: 'Toggle to enable or disable SAP MDG connectivity',
    type: 'boolean',
    group: 'mdg',
  },
]

const SERVICE_TABS = [
  {
    key: 'platform',
    label: 'Platform',
    description: 'Core AI platform credentials and feature flags',
    icon: Globe,
  },
  {
    key: 'neo4j',
    label: 'Neo4j',
    description: 'Graph database connection details',
    icon: Database,
  },
  {
    key: 'fdc',
    label: 'USDA FDC',
    description: 'Nutrition data integration settings',
    icon: Wine,
  },
  {
    key: 'ollama',
    label: 'Ollama',
    description: 'Local LLM inference configuration',
    icon: Sparkle,
  },
  {
    key: 'plm',
    label: 'PLM',
    description: 'Product lifecycle management API configuration',
    icon: TreeStructure,
  },
  {
    key: 'mdg',
    label: 'SAP MDG',
    description: 'Master data governance connection details',
    icon: Factory,
  },
]

const FIELD_DEFAULTS = FIELD_DEFINITIONS.reduce((acc, field) => {
  if (field.type === 'boolean') {
    acc[field.key] = false
  } else if (field.type === 'number') {
    acc[field.key] = ''
  } else {
    acc[field.key] = ''
  }
  return acc
}, {})

function ensureFieldDefaults(source) {
  const next = { ...FIELD_DEFAULTS, ...(source || {}) }
  return next
}

function castValueForPayload(field, value) {
  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) {
      return undefined
    }
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  if (field.type === 'boolean') {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true'
    }
    return Boolean(value)
  }

  return value ?? ''
}

export function EnvironmentConfigPanel() {
  const [appConfig] = useAppConfig()
  const [values, setValues] = useState(ensureFieldDefaults({}))
  const [savedValues, setSavedValues] = useState(ensureFieldDefaults({}))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState({})
  const [testing, setTesting] = useState({})
  const [testResults, setTestResults] = useState({})
  const [activeTab, setActiveTab] = useState(SERVICE_TABS[0].key)
  const [secretVisibility, setSecretVisibility] = useState({})

  useEffect(() => {
    if (appConfig?.backend?.apiUrl) {
      envService.setBackendUrl(appConfig.backend.apiUrl)
      fdcService.setBackendUrl(appConfig.backend.apiUrl)
    }
  }, [appConfig?.backend?.apiUrl])

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const response = await envService.getEnvSettings()
        const incoming = ensureFieldDefaults(response?.values || {})
        setValues(incoming)
        setSavedValues(incoming)
        if (incoming.FDC_API_KEY) {
          fdcService.setApiKey(incoming.FDC_API_KEY)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load environment settings')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const groupFields = useMemo(() => {
    const map = SERVICE_TABS.reduce((acc, tab) => {
      acc[tab.key] = FIELD_DEFINITIONS.filter((field) => field.group === tab.key)
      return acc
    }, {})
    return map
  }, [])

  const isDirty = useMemo(() => {
    return FIELD_DEFINITIONS.some((field) => {
      return (savedValues[field.key] ?? FIELD_DEFAULTS[field.key]) !== (values[field.key] ?? FIELD_DEFAULTS[field.key])
    })
  }, [savedValues, values])

  const isGroupDirty = (groupKey) => {
    return (groupFields[groupKey] || []).some((field) => {
      return (savedValues[field.key] ?? FIELD_DEFAULTS[field.key]) !== (values[field.key] ?? FIELD_DEFAULTS[field.key])
    })
  }

  const handleFieldChange = (key, nextValue) => {
    setValues((prev) => ({
      ...prev,
      [key]: nextValue,
    }))
  }

  const toggleSecretVisibility = (key) => {
    setSecretVisibility((prev) => ({
      ...prev,
      [key]: !prev?.[key],
    }))
  }

  const handleReset = (groupKey) => {
    setValues((prev) => {
      const next = { ...prev }
      for (const field of groupFields[groupKey] || []) {
        next[field.key] = savedValues[field.key] ?? FIELD_DEFAULTS[field.key]
      }
      return next
    })
    toast.info(`${SERVICE_TABS.find((tab) => tab.key === groupKey)?.label || 'Settings'} reverted`)
  }

  const handleSave = async (groupKey) => {
    const fields = groupFields[groupKey] || []
    if (fields.length === 0) {
      return
    }

    setSaving((prev) => ({ ...prev, [groupKey]: true }))
    try {
      const payload = {}

      fields.forEach((field) => {
        const value = values[field.key]
        const formatted = castValueForPayload(field, value)
        if (formatted !== undefined) {
          payload[field.key] = formatted
        }
      })

      const response = await envService.updateEnvSettings(payload)
      const updatedValues = ensureFieldDefaults(response?.values || {})
      setValues(updatedValues)
      setSavedValues(updatedValues)
      if (updatedValues.FDC_API_KEY) {
        fdcService.setApiKey(updatedValues.FDC_API_KEY)
      }
      toast.success(`${SERVICE_TABS.find((tab) => tab.key === groupKey)?.label || 'Settings'} saved`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update environment configuration')
    } finally {
      setSaving((prev) => ({ ...prev, [groupKey]: false }))
    }
  }

  const handleTest = async (groupKey) => {
    setTesting((prev) => ({ ...prev, [groupKey]: true }))
    setTestResults((prev) => ({ ...prev, [groupKey]: undefined }))

    const setSuccess = (message) => {
      setTestResults((prev) => ({
        ...prev,
        [groupKey]: { status: 'success', message },
      }))
    }

    const setFailure = (message) => {
      setTestResults((prev) => ({
        ...prev,
        [groupKey]: { status: 'error', message },
      }))
    }

    try {
      switch (groupKey) {
        case 'platform': {
          const health = await envService.getServiceHealth()
          const statusLabel = health.status || 'unknown'
          setSuccess(`Backend health: ${statusLabel}`)
          break
        }
        case 'neo4j': {
          const uri = (values.NEO4J_URI || '').trim()
          const username = (values.NEO4J_USER || '').trim()
          const password = values.NEO4J_PASSWORD || ''
          const database = (values.NEO4J_DATABASE || 'neo4j').trim() || 'neo4j'

          if (!uri) {
            throw new Error('Provide a Neo4j URI before testing')
          }
          if (!username) {
            throw new Error('Provide a Neo4j username before testing')
          }
          if (!password) {
            throw new Error('Provide a Neo4j password before testing')
          }

          const result = await envService.testNeo4jConnection({
            uri,
            username,
            password,
            database,
          })

          if (result.success) {
            const versionSuffix = result.server_version ? ` (Neo4j ${result.server_version})` : ''
            setSuccess(`Neo4j connection successful${versionSuffix}`)
          } else {
            setFailure(result.message || 'Neo4j connection failed')
          }
          break
        }
        case 'ollama': {
          const health = await envService.getServiceHealth()
          if (health.llm_available) {
            setSuccess(`Ollama responding (model: ${health.ollama_model || 'unknown'})`)
          } else {
            setFailure('Ollama service is not reachable according to backend health check')
          }
          break
        }
        case 'fdc': {
          const apiKey = values.FDC_API_KEY || undefined
          await fdcService.searchFoods({ query: 'apple', pageSize: 1, apiKey })
          setSuccess('Successfully queried USDA FDC through backend')
          break
        }
        case 'plm': {
          const baseUrl = (values.PLM_API_BASE_URL || '').trim()
          if (!baseUrl) {
            throw new Error('Provide PLM API base URL before testing')
          }
          const endpoint = `${baseUrl.replace(/\/$/, '')}/health`
          const headers = {}
          if (values.PLM_API_KEY) {
            headers.Authorization = `Bearer ${values.PLM_API_KEY}`
          }
          const response = await fetch(endpoint, { headers })
          if (!response.ok) {
            throw new Error(`PLM health check returned ${response.status}`)
          }
          setSuccess('PLM health endpoint responded successfully')
          break
        }
        case 'mdg': {
          const baseUrl = (values.MDG_API_BASE_URL || '').trim()
          if (!baseUrl) {
            throw new Error('Provide SAP MDG API base URL before testing')
          }
          const endpoint = `${baseUrl.replace(/\/$/, '')}/health`
          const headers = {}
          if (values.MDG_API_KEY) {
            headers.Authorization = `Bearer ${values.MDG_API_KEY}`
          }
          const response = await fetch(endpoint, { headers })
          if (!response.ok) {
            throw new Error(`SAP MDG health check returned ${response.status}`)
          }
          setSuccess('SAP MDG health endpoint responded successfully')
          break
        }
        default:
          setFailure('No test available for this tab')
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Test failed')
    } finally {
      setTesting((prev) => ({ ...prev, [groupKey]: false }))
    }
  }

  const renderField = (field) => {
    const rawValue = values?.[field.key]
    const booleanValue =
      field.type === 'boolean'
        ? typeof rawValue === 'string'
          ? rawValue.toLowerCase() === 'true'
          : Boolean(rawValue)
        : undefined
    const inputValue = field.type === 'boolean' ? booleanValue : rawValue ?? FIELD_DEFAULTS[field.key]
    const isSecretVisible = secretVisibility?.[field.key]

    return (
      <div key={field.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
            {field.key}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{field.description}</p>

        {field.type === 'boolean' ? (
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span className="text-sm text-muted-foreground">{booleanValue ? 'Enabled' : 'Disabled'}</span>
            <Switch
              id={field.key}
              checked={Boolean(booleanValue)}
              onCheckedChange={(checked) => handleFieldChange(field.key, checked)}
              disabled={loading || saving[field.group] || testing[field.group]}
            />
          </div>
        ) : (
          <div className="relative">
            <Input
              id={field.key}
              type={
                field.type === 'secret'
                  ? isSecretVisible
                    ? 'text'
                    : 'password'
                  : field.type === 'number'
                  ? 'number'
                  : 'text'
              }
              value={inputValue}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={loading || saving[field.group] || testing[field.group]}
            />
            {field.type === 'secret' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => toggleSecretVisibility(field.key)}
              >
                {isSecretVisible ? <EyeSlash size={18} /> : <Eye size={18} />}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CloudArrowUp size={22} className="text-primary" weight="bold" />
              Environment Overrides
            </CardTitle>
            <CardDescription>Update shared backend credentials stored in <code>env.local.json</code></CardDescription>
          </div>
          <Badge variant={loading ? 'secondary' : isDirty ? 'secondary' : 'outline'} className="gap-1">
            {loading ? 'Loading...' : isDirty ? 'Unsaved changes' : 'Synced'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" weight="bold" />
          <AlertDescription>
            Changes apply immediately after saving. Some services might require a manual reconnect or backend restart.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2">
            {SERVICE_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                  <Icon size={16} weight="bold" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {SERVICE_TABS.map((tab) => {
            const fields = groupFields[tab.key] || []
            const dirty = isGroupDirty(tab.key)
            const savingGroup = Boolean(saving[tab.key])
            const testingGroup = Boolean(testing[tab.key])
            const testResult = testResults[tab.key]
            const SectionIcon = tab.icon

            return (
              <TabsContent key={tab.key} value={tab.key} className="space-y-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <SectionIcon size={20} className="text-primary" weight="bold" />
                    {tab.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{tab.description}</p>
                </div>

                {fields.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No configurable fields for this section yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => renderField(field))}</div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleReset(tab.key)}
                    disabled={!dirty || savingGroup || testingGroup || loading}
                    className="gap-2"
                  >
                    <ArrowCounterClockwise size={16} weight="bold" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTest(tab.key)}
                    disabled={savingGroup || testingGroup || loading}
                    className="gap-2"
                  >
                    {testingGroup ? (
                      <>
                        <Lightning size={16} className="animate-spin" weight="bold" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Lightning size={16} weight="bold" />
                        Test
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSave(tab.key)}
                    disabled={!dirty || savingGroup || testingGroup || loading}
                    className="gap-2"
                  >
                    <FloppyDiskBack size={16} weight="bold" />
                    {savingGroup ? 'Saving...' : 'Save'}
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      testResult.status === 'success'
                        ? 'border-green-500/40 bg-green-500/10 text-green-700'
                        : 'border-red-500/40 bg-red-500/10 text-red-700'
                    }`}
                  >
                    {testResult.status === 'success' ? (
                      <CheckCircle size={16} weight="fill" />
                    ) : (
                      <Warning size={16} weight="fill" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
