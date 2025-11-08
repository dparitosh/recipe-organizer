import { Alert, AlertDescription } from '@/components/ui/alert'
import { EnvironmentConfigPanel } from './EnvironmentConfigPanel'
import { Info } from '@phosphor-icons/react'

export function BackendConfigPanel() {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" weight="bold" />
        <AlertDescription>
          All backend integrations now rely on the Environment Overrides. Update credentials and endpoints below to
          keep Neo4j, USDA FDC, PLM, SAP MDG, and Ollama aligned without juggling multiple tabs.
        </AlertDescription>
      </Alert>

      <EnvironmentConfigPanel />
    </div>
  )
}
