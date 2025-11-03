import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { GraphView } from '@/components/views/GraphView'
import { FormulationsView } from '@/components/views/FormulationsView'
import { IngestView } from '@/components/views/IngestView'
import { SettingsView } from '@/components/views/SettingsViewNew'
import { OrchestrationView } from '@/components/orchestration/OrchestrationView.jsx'
import { useAppConfig } from '@/lib/config/app-config'

function App() {
  const [config] = useAppConfig()
  const [currentView, setCurrentView] = useState('orchestration')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [backendUrl, setBackendUrl] = useState(config.backend.apiUrl)

  useEffect(() => {
    setBackendUrl(config.backend.apiUrl)
  }, [config.backend.apiUrl])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position={config.ui.toastPosition as any} />
      
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        backendUrl={backendUrl}
      />

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
          {currentView === 'orchestration' && <OrchestrationView />}
          {currentView === 'dashboard' && <GraphView backendUrl={backendUrl} />}
          {currentView === 'formulations' && <FormulationsView backendUrl={backendUrl} />}
          {currentView === 'graph' && <GraphView backendUrl={backendUrl} />}
          {currentView === 'ingest' && <IngestView backendUrl={backendUrl} />}
          {currentView === 'settings' && (
            <SettingsView 
              backendUrl={backendUrl}
              onBackendUrlChange={setBackendUrl}
            />
          )}
        </MainContent>
      </div>
    </div>
  )
}

export default App
