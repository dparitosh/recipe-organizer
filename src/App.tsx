import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { GraphView } from '@/components/views/GraphView'
import { FormulationsView } from '@/components/views/FormulationsView'
import { IngestView } from '@/components/views/IngestView'
import { SettingsView } from '@/components/views/SettingsView'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useKV } from '@github/spark/hooks'
import { Warning, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export type View = 'dashboard' | 'formulations' | 'graph' | 'ingest' | 'settings'

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [backendUrl, setBackendUrl] = useKV<string>('backend-url', 'http://localhost:8000')
  const [showMockAlert, setShowMockAlert] = useKV<boolean>('show-mock-alert', true)
  const [isMockMode, setIsMockMode] = useState(false)

  const backendUrlValue = backendUrl || 'http://localhost:8000'

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${backendUrlValue}/health`, { 
          signal: AbortSignal.timeout(3000) 
        })
        setIsMockMode(!response.ok)
      } catch {
        setIsMockMode(true)
      }
    }
    checkBackend()
  }, [backendUrlValue])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-center" />
      
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        backendUrl={backendUrlValue}
      />

      {isMockMode && showMockAlert && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <Alert className="flex-1 border-0 bg-transparent p-0">
              <Warning size={20} className="text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                <strong>Mock Mode:</strong> The application is using sample data because the backend server is not available. 
                All features are functional with demo data. Visit <button onClick={() => setCurrentView('settings')} className="underline font-medium">Settings</button> for setup instructions.
              </AlertDescription>
            </Alert>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowMockAlert(false)}
              className="h-8 w-8 shrink-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          open={sidebarOpen}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        <MainContent 
          view={currentView}
          sidebarOpen={sidebarOpen}
        >
          {currentView === 'dashboard' && <GraphView backendUrl={backendUrlValue} />}
          {currentView === 'formulations' && <FormulationsView backendUrl={backendUrlValue} />}
          {currentView === 'graph' && <GraphView backendUrl={backendUrlValue} />}
          {currentView === 'ingest' && <IngestView backendUrl={backendUrlValue} />}
          {currentView === 'settings' && (
            <SettingsView 
              backendUrl={backendUrlValue}
              onBackendUrlChange={setBackendUrl}
            />
          )}
        </MainContent>
      </div>
    </div>
  )
}

export default App
