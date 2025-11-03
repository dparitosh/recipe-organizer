import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { GraphView } from '@/components/views/GraphView'
import { FormulationsView } from '@/components/views/FormulationsView'
import { IngestView } from '@/components/views/IngestView'
import { SettingsView } from '@/components/views/SettingsView'
import { OrchestrationView } from '@/components/orchestration/OrchestrationView.jsx'
import { useKV } from '@github/spark/hooks'

function App() {
  const [currentView, setCurrentView] = useState('orchestration')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [backendUrl, setBackendUrl] = useKV('backend-url', 'http://localhost:8000')

  const backendUrlValue = backendUrl || 'http://localhost:8000'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-center" />
      
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        backendUrl={backendUrlValue}
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
