import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  House, 
  Flask, 
  Graph, 
  UploadSimple, 
  Gear,
  Sparkle
} from '@phosphor-icons/react'

const navItems = [
  { view: 'orchestration', label: 'AI Orchestration', icon: Sparkle },
  { view: 'dashboard', label: 'Dashboard', icon: House },
  { view: 'formulations', label: 'Formulations', icon: Flask },
  { view: 'graph', label: 'Graph Explorer', icon: Graph },
  { view: 'ingest', label: 'Data Import', icon: UploadSimple },
  { view: 'settings', label: 'Settings', icon: Gear },
]

export function Sidebar({ open, currentView, onViewChange }) {
  return (
    <>
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <nav className="p-4 space-y-2 pt-20 lg:pt-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.view
            
            return (
              <Button
                key={item.view}
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  isActive && "shadow-md"
                )}
                onClick={() => onViewChange(item.view)}
              >
                <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                <span className="font-medium">{item.label}</span>
              </Button>
            )
          })}
        </nav>
      </aside>

      {open && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => onViewChange(currentView)}
        />
      )}
    </>
  )
}
