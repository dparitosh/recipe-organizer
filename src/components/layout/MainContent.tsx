import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { View } from '@/App'

interface MainContentProps {
  children: ReactNode
  view: View
  sidebarOpen: boolean
}

export function MainContent({ children, view, sidebarOpen }: MainContentProps) {
  return (
    <main className={cn(
      "flex-1 overflow-auto transition-all duration-300",
      sidebarOpen ? "lg:ml-0" : "ml-0"
    )}>
      <div className="p-6 max-w-[1920px] mx-auto">
        {children}
      </div>
    </main>
  )
}
