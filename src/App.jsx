import { useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { DashboardView } from '@/components/views/DashboardView'
import { GraphView } from '@/components/views/GraphView'
import { FormulationsView } from '@/components/views/FormulationsView'
import { IngestView } from '@/components/views/IngestView'
import { SettingsView } from '@/components/views/SettingsView'
import { OrchestrationView } from '@/components/orchestration/OrchestrationView.jsx'
import { useAppConfig } from '@/lib/config/app-config'
import { backendUrlAtom } from '@/state/atoms'
import { envService } from '@/lib/services/env-service'
import { aiAssistant } from '@/lib/ai'

function App() {
  const [config] = useAppConfig()
  const [currentView, setCurrentView] = useState('orchestration')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [backendUrl, setBackendUrl] = useRecoilState(backendUrlAtom)

  useEffect(() => {
    const normalizedApiUrl = (config.backend.apiUrl || '').replace(/\/$/, '')

    if (normalizedApiUrl) {
      envService.setBackendUrl(normalizedApiUrl)
      aiAssistant.setBackendUrl(normalizedApiUrl)
      setBackendUrl(normalizedApiUrl)
    }
  }, [config.backend.apiUrl, setBackendUrl])

  useEffect(() => {
    let isActive = true

    const loadPersistedBackendUrl = async () => {
      try {
        const result = await envService.getEnvSettings()
        const persistedUrl = result?.values?.BACKEND_API_URL

        if (!isActive || typeof persistedUrl !== 'string' || !persistedUrl.trim()) {
          return
        }

        const sanitizedUrl = persistedUrl.trim().replace(/\/$/, '')

        envService.setBackendUrl(sanitizedUrl)
        aiAssistant.setBackendUrl(sanitizedUrl)
        setBackendUrl((previous) => (previous === sanitizedUrl ? previous : sanitizedUrl))
      } catch (error) {
        console.warn('Failed to load persisted backend URL from env.local.json', error)
      }
    }

    loadPersistedBackendUrl()

    return () => {
      isActive = false
    }
  }, [setBackendUrl])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position={config.ui?.toastPosition ?? 'top-right'} />

      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} backendUrl={backendUrl} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar open={sidebarOpen} currentView={currentView} onViewChange={setCurrentView} />

        <MainContent view={currentView} sidebarOpen={sidebarOpen}>
          {currentView === 'orchestration' && <OrchestrationView />}
          {currentView === 'dashboard' && (
            <DashboardView backendUrl={backendUrl} onNavigate={setCurrentView} />
          )}
          {currentView === 'formulations' && <FormulationsView backendUrl={backendUrl} />}
          {currentView === 'graph' && <GraphView backendUrl={backendUrl} />}
          {currentView === 'ingest' && <IngestView backendUrl={backendUrl} />}
          {currentView === 'settings' && <SettingsView />}
        </MainContent>
      </div>
    </div>
  )
}

export default App
