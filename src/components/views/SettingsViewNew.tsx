import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Gear, CloudArrowDown, Database, Palette, Flask, Calculator, Network, FileText } from '@phosphor-icons/react'
import { useAppConfig } from '@/lib/config/app-config'
import { BackendSettings } from '@/components/settings/BackendSettings'
import { AIServiceSettings } from '@/components/AIServiceSettings'
import { Neo4jSettings } from '@/components/Neo4jSettings'
import { UISettings } from '@/components/settings/UISettings'
import { FDCSettings } from '@/components/settings/FDCSettings'
import { CalculationSettings } from '@/components/settings/CalculationSettings'
import { GraphSettings } from '@/components/settings/GraphSettings'
import { OrchestrationSettings } from '@/components/settings/OrchestrationSettings'
import { DataImportMapper } from '@/components/DataImportMapper'

interface SettingsViewProps {
  backendUrl: string
  onBackendUrlChange: (url: string) => void
}

export function SettingsView({ backendUrl, onBackendUrlChange }: SettingsViewProps) {
  const [config, setConfig] = useAppConfig()

  const handleConfigChange = (updates: any) => {
    const newConfig = {
      ...config,
      ...updates,
    }
    setConfig(newConfig)
    
    if (updates.backend?.apiUrl) {
      onBackendUrlChange(updates.backend.apiUrl)
    }
  }

  const handleImportComplete = (data: any) => {
    console.log('Import complete:', data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure all application settings from this centralized location
        </p>
      </div>

      <Tabs defaultValue="backend" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="backend" className="gap-2">
            <Gear size={16} />
            <span className="hidden sm:inline">Backend</span>
          </TabsTrigger>
          <TabsTrigger value="neo4j" className="gap-2">
            <Database size={16} />
            <span className="hidden sm:inline">Neo4j</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <CloudArrowDown size={16} />
            <span className="hidden sm:inline">AI Service</span>
          </TabsTrigger>
          <TabsTrigger value="fdc" className="gap-2">
            <FileText size={16} />
            <span className="hidden sm:inline">FDC API</span>
          </TabsTrigger>
          <TabsTrigger value="ui" className="gap-2">
            <Palette size={16} />
            <span className="hidden sm:inline">UI</span>
          </TabsTrigger>
          <TabsTrigger value="calculation" className="gap-2">
            <Calculator size={16} />
            <span className="hidden sm:inline">Calculations</span>
          </TabsTrigger>
          <TabsTrigger value="graph" className="gap-2">
            <Network size={16} />
            <span className="hidden sm:inline">Graph</span>
          </TabsTrigger>
          <TabsTrigger value="orchestration" className="gap-2">
            <Flask size={16} />
            <span className="hidden sm:inline">Orchestration</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backend" className="mt-6">
          <BackendSettings config={config} onConfigChange={handleConfigChange} />
        </TabsContent>

        <TabsContent value="neo4j" className="mt-6">
          <Neo4jSettings />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIServiceSettings />
        </TabsContent>

        <TabsContent value="fdc" className="mt-6">
          <FDCSettings config={config} onConfigChange={handleConfigChange} />
        </TabsContent>

        <TabsContent value="ui" className="mt-6">
          <UISettings config={config} onConfigChange={handleConfigChange} />
        </TabsContent>

        <TabsContent value="calculation" className="mt-6">
          <CalculationSettings config={config} onConfigChange={handleConfigChange} />
        </TabsContent>

        <TabsContent value="graph" className="mt-6">
          <GraphSettings config={config} onConfigChange={handleConfigChange} />
        </TabsContent>

        <TabsContent value="orchestration" className="mt-6">
          <OrchestrationSettings config={config} onConfigChange={handleConfigChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
