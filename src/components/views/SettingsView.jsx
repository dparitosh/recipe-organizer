import { BackendConfigPanel } from '@/components/integrations/BackendConfigPanel'

export function SettingsView() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage all backend credentials and service endpoints through Environment Overrides
        </p>
      </div>

      <BackendConfigPanel />
    </div>
  )
}
