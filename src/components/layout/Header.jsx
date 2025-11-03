import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { List, Flask } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

export function Header({ onMenuClick, backendUrl }) {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${backendUrl}/health`, { 
          signal: AbortSignal.timeout(3000) 
        })
        if (response.ok) {
          const data = await response.json()
          setBackendStatus(data.mode === 'mock' ? 'mock' : 'connected')
        } else {
          setBackendStatus('mock')
        }
      } catch {
        setBackendStatus('mock')
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [backendUrl])

  return (
    <header className="h-16 border-b border-border bg-card shadow-sm sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <List size={24} weight="bold" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <Flask className="text-primary-foreground" size={24} weight="bold" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Formulation Graph Studio
              </h1>
              <p className="text-xs text-muted-foreground">
                Modern F&B Management Platform
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge 
            variant={backendStatus === 'connected' ? 'default' : 'secondary'}
            className="gap-1.5"
          >
            <span className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' :
              backendStatus === 'checking' ? 'bg-yellow-500 animate-pulse' :
              'bg-yellow-500'
            }`} />
            {backendStatus === 'connected' ? 'Backend Connected' : 
             backendStatus === 'checking' ? 'Checking...' : 
             'Mock Mode'}
          </Badge>
        </div>
      </div>
    </header>
  )
}
